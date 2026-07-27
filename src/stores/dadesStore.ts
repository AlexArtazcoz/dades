import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { Sector, Repositori, Referencia, Attachment } from '../types';
import * as db from '../services/db';
import type { ActiveView } from '../services/db';

interface DadesState {
  sectors: Sector[];
  repositoris: Repositori[];
  referencies: Referencia[];
  attachments: Attachment[]; // els adjunts de la vista activa (la galeria)
  activeView: ActiveView;
  isLoading: boolean;
  error: string | null;

  // Càrrega
  loadAll: () => Promise<void>;

  // Vista activa
  setActiveView: (view: ActiveView) => void;

  // Sectors
  createSector: (name: string, emoji: string) => Promise<Sector>;
  updateSector: (id: string, updates: Partial<Sector>) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;

  // Repositoris
  createRepositori: (
    sectorId: string,
    data: { name: string; emoji?: string; sourceUrl?: string; description?: string },
  ) => Promise<Repositori>;
  updateRepositori: (id: string, updates: Partial<Repositori>) => Promise<void>;
  deleteRepositori: (id: string) => Promise<void>;

  // Referències
  createReferencia: (repositoriId: string, data?: Partial<Referencia>) => Promise<Referencia>;
  updateReferencia: (id: string, updates: Partial<Referencia>) => Promise<void>;
  deleteReferencia: (id: string) => Promise<void>;
  reorderReferencies: (repositoriId: string, newOrder: string[]) => Promise<void>;

  // Adjunts
  loadAttachmentsForView: () => Promise<void>;
  deleteAttachment: (id: string) => Promise<void>;
  renameAttachment: (id: string, name: string) => Promise<void>;

  // Helpers
  getSector: (id: string) => Sector | undefined;
  getRepositori: (id: string) => Repositori | undefined;
  getRepositorisForSector: (sectorId: string) => Repositori[];
  countReferencies: (repositoriId: string) => number;
  // Les referències que la vista activa ha d'ensenyar (la galeria de la Fase 3
  // llegeix d'aquí). Dins d'un repositori mana referenceOrder; a les vistes
  // sector/tot s'ordena per updatedAt descendent.
  getVisibleReferencies: () => Referencia[];
}

export const useDadesStore = create<DadesState>()(
  immer((set, get) => ({
    sectors: [],
    repositoris: [],
    referencies: [],
    attachments: [],
    activeView: { mode: 'tot' },
    isLoading: false,
    error: null,

    // === Càrrega ===

    loadAll: async () => {
      set(state => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const [sectors, repositoris, referencies] = await Promise.all([
          db.getAllSectors(),
          db.getAllRepositoris(),
          db.getAllReferencies(),
        ]);

        // La vista guardada només val si el que assenyala encara existeix
        const stored = db.getStoredActiveView();
        let activeView: ActiveView = { mode: 'tot' };
        if (stored?.mode === 'sector' && sectors.some(s => s.id === stored.id)) {
          activeView = stored;
        } else if (stored?.mode === 'repositori' && repositoris.some(r => r.id === stored.id)) {
          activeView = stored;
        }

        set(state => {
          state.sectors = sectors;
          state.repositoris = repositoris;
          state.referencies = referencies;
          state.activeView = activeView;
          state.isLoading = false;
        });
      } catch {
        set(state => {
          state.error = 'No s\'han pogut carregar les dades';
          state.isLoading = false;
        });
      }
    },

    // === Vista activa ===

    setActiveView: (view: ActiveView) => {
      db.setStoredActiveView(view);
      set(state => {
        state.activeView = view;
      });
    },

    // === Sectors ===

    createSector: async (name: string, emoji: string) => {
      const maxOrder = get().sectors.reduce((max, s) => Math.max(max, s.order), -1);
      const sector: Sector = {
        id: uuidv4(),
        name: name.trim(),
        emoji: emoji.trim(),
        order: maxOrder + 1,
        createdAt: Date.now(),
      };
      await db.saveSector(sector);
      set(state => {
        state.sectors.push(sector);
      });
      return sector;
    },

    updateSector: async (id: string, updates: Partial<Sector>) => {
      set(state => {
        const sector = state.sectors.find(s => s.id === id);
        if (sector) Object.assign(sector, updates);
      });
      const sector = get().sectors.find(s => s.id === id);
      if (sector) await db.saveSector(sector);
    },

    deleteSector: async (id: string) => {
      await db.deleteSector(id); // cascada: repositoris, referències i adjunts
      set(state => {
        const repoIds = new Set(state.repositoris.filter(r => r.sectorId === id).map(r => r.id));
        state.sectors = state.sectors.filter(s => s.id !== id);
        state.repositoris = state.repositoris.filter(r => r.sectorId !== id);
        state.referencies = state.referencies.filter(r => !repoIds.has(r.repositoriId));
        // La vista apuntava a alguna cosa esborrada → cap a "tot"
        const view = state.activeView;
        if (
          (view.mode === 'sector' && view.id === id) ||
          (view.mode === 'repositori' && repoIds.has(view.id))
        ) {
          state.activeView = { mode: 'tot' };
          db.setStoredActiveView({ mode: 'tot' });
        }
      });
    },

    // === Repositoris ===

    createRepositori: async (sectorId, data) => {
      const repositori: Repositori = {
        id: uuidv4(),
        sectorId,
        name: data.name.trim(),
        emoji: data.emoji?.trim() ?? '',
        sourceUrl: data.sourceUrl?.trim() ?? '',
        description: data.description?.trim() ?? '',
        referenceOrder: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.saveRepositori(repositori);
      set(state => {
        state.repositoris.unshift(repositori);
      });
      return repositori;
    },

    updateRepositori: async (id: string, updates: Partial<Repositori>) => {
      set(state => {
        const repositori = state.repositoris.find(r => r.id === id);
        if (repositori) Object.assign(repositori, updates, { updatedAt: Date.now() });
      });
      const repositori = get().repositoris.find(r => r.id === id);
      if (repositori) await db.saveRepositori(repositori);
    },

    deleteRepositori: async (id: string) => {
      await db.deleteRepositori(id); // cascada: referències i adjunts
      set(state => {
        state.repositoris = state.repositoris.filter(r => r.id !== id);
        state.referencies = state.referencies.filter(r => r.repositoriId !== id);
        const view = state.activeView;
        if (view.mode === 'repositori' && view.id === id) {
          state.activeView = { mode: 'tot' };
          db.setStoredActiveView({ mode: 'tot' });
        }
      });
    },

    // === Referències ===

    createReferencia: async (repositoriId: string, data?: Partial<Referencia>) => {
      const referencia: Referencia = {
        id: uuidv4(),
        repositoriId,
        title: '',
        url: '',
        note: '',
        tags: [],
        coverAttachmentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...data,
      };
      await db.saveReferencia(referencia);
      set(state => {
        state.referencies.push(referencia);
        const repositori = state.repositoris.find(r => r.id === repositoriId);
        if (repositori) {
          repositori.referenceOrder.unshift(referencia.id);
          repositori.updatedAt = Date.now();
        }
      });
      const repositori = get().repositoris.find(r => r.id === repositoriId);
      if (repositori) await db.saveRepositori(repositori);
      return referencia;
    },

    updateReferencia: async (id: string, updates: Partial<Referencia>) => {
      set(state => {
        const referencia = state.referencies.find(r => r.id === id);
        if (referencia) Object.assign(referencia, updates, { updatedAt: Date.now() });
      });
      const referencia = get().referencies.find(r => r.id === id);
      if (referencia) await db.saveReferencia(referencia);
    },

    deleteReferencia: async (id: string) => {
      const referencia = get().referencies.find(r => r.id === id);
      await db.deleteReferencia(id); // cascada: adjunts
      set(state => {
        state.referencies = state.referencies.filter(r => r.id !== id);
        if (referencia) {
          const repositori = state.repositoris.find(r => r.id === referencia.repositoriId);
          if (repositori) {
            repositori.referenceOrder = repositori.referenceOrder.filter(rid => rid !== id);
          }
        }
      });
      if (referencia) {
        const repositori = get().repositoris.find(r => r.id === referencia.repositoriId);
        if (repositori) await db.saveRepositori(repositori);
      }
    },

    reorderReferencies: async (repositoriId: string, newOrder: string[]) => {
      set(state => {
        const repositori = state.repositoris.find(r => r.id === repositoriId);
        if (repositori) repositori.referenceOrder = newOrder;
      });
      const repositori = get().repositoris.find(r => r.id === repositoriId);
      if (repositori) await db.saveRepositori(repositori);
    },

    // === Adjunts ===

    loadAttachmentsForView: async () => {
      const view = get().activeView;
      let attachments: Attachment[];
      if (view.mode === 'repositori') {
        attachments = await db.getAttachmentsForRepositori(view.id);
      } else if (view.mode === 'sector') {
        const ids = get().repositoris.filter(r => r.sectorId === view.id).map(r => r.id);
        attachments = await db.getAttachmentsForRepositoris(ids);
      } else {
        attachments = await db.getAllAttachments();
      }
      // La vista pot haver canviat mentre llegíem d'IndexedDB: no la xafem
      if (get().activeView !== view) return;
      set(state => {
        state.attachments = attachments;
      });
    },

    deleteAttachment: async (id: string) => {
      const attachment = get().attachments.find(a => a.id === id);
      await db.deleteAttachment(id);
      set(state => {
        state.attachments = state.attachments.filter(a => a.id !== id);
      });
      // Si era la portada d'una referència, passa-la al següent adjunt (o cap)
      if (attachment) {
        const referencia = get().referencies.find(r => r.id === attachment.referenciaId);
        if (referencia?.coverAttachmentId === id) {
          const next = get().attachments.find(a => a.referenciaId === referencia.id);
          await get().updateReferencia(referencia.id, { coverAttachmentId: next?.id ?? null });
        }
      }
    },

    renameAttachment: async (id: string, name: string) => {
      await db.renameAttachment(id, name);
      set(state => {
        const attachment = state.attachments.find(a => a.id === id);
        if (attachment) attachment.name = name;
      });
    },

    // === Helpers ===

    getSector: (id: string) => get().sectors.find(s => s.id === id),
    getRepositori: (id: string) => get().repositoris.find(r => r.id === id),
    getRepositorisForSector: (sectorId: string) =>
      get().repositoris.filter(r => r.sectorId === sectorId),
    countReferencies: (repositoriId: string) =>
      get().referencies.filter(r => r.repositoriId === repositoriId).length,

    getVisibleReferencies: (): Referencia[] => {
      const { activeView, referencies, repositoris } = get();

      if (activeView.mode === 'repositori') {
        const repositori = repositoris.find(r => r.id === activeView.id);
        if (!repositori) return [];
        const byId = new Map(
          referencies.filter(r => r.repositoriId === repositori.id).map(r => [r.id, r]),
        );
        const ordered = repositori.referenceOrder
          .map(id => byId.get(id))
          .filter((r): r is Referencia => !!r);
        // Referències fora de referenceOrder (estat parcial): al final, mai perdudes
        const inOrder = new Set(repositori.referenceOrder);
        return [...ordered, ...[...byId.values()].filter(r => !inOrder.has(r.id))];
      }

      let pool = referencies;
      if (activeView.mode === 'sector') {
        const repoIds = new Set(
          repositoris.filter(r => r.sectorId === activeView.id).map(r => r.id),
        );
        pool = referencies.filter(r => repoIds.has(r.repositoriId));
      }
      return [...pool].sort((a, b) => b.updatedAt - a.updatedAt);
    },
  }))
);

// A la consola en dev, com __db: permet inspeccionar i provar l'store a mà
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__store = useDadesStore;
}
