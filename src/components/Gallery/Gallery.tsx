import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link as LinkIcon, Pencil, Search, X } from 'lucide-react';
import { AttachmentViewer } from '../Attachments/AttachmentViewer';
import { ReferenciaModal } from './ReferenciaModal';
import { isImageAttachment, useBlobUrl } from '../Attachments/attachmentUtils';
import { useDadesStore } from '../../stores/dadesStore';
import { useUIStore } from '../../stores/uiStore';
import { DEVICE_HAS_HOVER } from '../../utils/interaction';
import { LEFTBAR_W } from '../../constants';
import type { Attachment, Referencia } from '../../types';

/* La galeria: graella masonry amb les referències de la vista activa.
   Cada fitxa ensenya la seva portada (coverAttachmentId o el primer adjunt);
   clic → visor a pantalla completa que recorre TOTS els adjunts de la vista.
   Dins d'un repositori les fitxes es reordenen arrossegant (dnd-kit); a les
   vistes sector/tot l'ordre és per updatedAt i no s'arrossega res. */

function domainOf(url: string): string {
  if (!url) return '';
  try {
    return new URL(url.includes('://') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Cerca sense accents ni majúscules: "secció" i "seccio" han de trobar el mateix
function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Els adjunts d'una referència en ordre de visor: portada primer, resta per antiguitat
function attachmentsOfRef(referencia: Referencia, attachments: Attachment[]): Attachment[] {
  const own = attachments
    .filter(a => a.referenciaId === referencia.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  if (!referencia.coverAttachmentId) return own;
  const cover = own.find(a => a.id === referencia.coverAttachmentId);
  return cover ? [cover, ...own.filter(a => a.id !== cover.id)] : own;
}

/* ── Una fitxa de la graella ── */
function GalleryCard({
  referencia,
  cover,
  subtitle,
  sortable,
  onOpen,
  onEdit,
}: {
  referencia: Referencia;
  cover: Attachment | null;
  subtitle: string; // nom del repositori (vistes sector/tot); '' per amagar-lo
  sortable: boolean;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: referencia.id,
    disabled: !sortable,
  });

  const isImage = cover ? isImageAttachment(cover) : false;
  const url = useBlobUrl(cover && isImage ? cover.blob : null);
  const domain = domainOf(referencia.url);
  const caption = referencia.title || domain || (cover ? cover.name : 'Sense títol');

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    breakInside: 'avoid',
    marginBottom: 16,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative rounded-xl overflow-hidden cursor-pointer bg-[#1c1c1c] border border-white/5 hover:border-white/15 transition-colors"
      onClick={onOpen}
      title={caption}
    >
      {cover && isImage ? (
        url && <img src={url} alt={caption} className="w-full block" draggable={false} />
      ) : cover ? (
        /* Adjunt que no és imatge (PDF): bloc amb etiqueta */
        <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-2 text-white/40">
          <span
            className="px-2 py-1 rounded-md bg-white/10 text-[11px] tracking-widest"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            PDF
          </span>
          <span className="text-[11px] max-w-[80%] truncate">{cover.name}</span>
        </div>
      ) : (
        /* Referència sense fitxers: fitxa de text (enllaç o nota) */
        <div className="w-full min-h-[120px] flex flex-col justify-center gap-2 p-4">
          <div className="flex items-center gap-2 text-white/40">
            <LinkIcon size={13} />
            <span className="text-[11px] truncate">{domain || '—'}</span>
          </div>
          <span className="text-white/80 text-[14px] leading-snug">
            {referencia.title || 'Sense títol'}
          </span>
          {referencia.note && (
            <span className="text-white/35 text-[12px] leading-snug line-clamp-3">{referencia.note}</span>
          )}
        </div>
      )}

      {/* Llapis d'edició — obre la fitxa de la referència */}
      <button
        onClick={e => { e.stopPropagation(); onEdit(); }}
        onPointerDown={e => e.stopPropagation()}
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/55 text-white/80 hover:text-white transition-all ${
          DEVICE_HAS_HOVER ? 'opacity-0 group-hover:opacity-100' : ''
        }`}
        title="Edita la referència"
      >
        <Pencil size={13} />
      </button>

      {/* Vel amb títol i domini — al hover (sempre visible en tàctil si hi ha imatge) */}
      {(cover || subtitle) && (
        <div
          className={`absolute inset-x-0 bottom-0 px-3 pt-8 pb-2.5 pointer-events-none transition-opacity duration-200 ${
            DEVICE_HAS_HOVER ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}
        >
          <div className="text-white text-[12px] font-medium leading-tight truncate">{caption}</div>
          <div className="flex items-center gap-2">
            {domain && referencia.title && (
              <span className="text-white/50 text-[10px] truncate">{domain}</span>
            )}
            {subtitle && (
              <span className="text-[10px] uppercase tracking-wider truncate" style={{ color: 'var(--color-accent)' }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Portada simplificada per al DragOverlay */
function DragCard({ cover }: { cover: Attachment | null }) {
  const url = useBlobUrl(cover && isImageAttachment(cover) ? cover.blob : null);
  return (
    <div
      className="rounded-xl overflow-hidden border-2 shadow-2xl bg-[#1c1c1c]"
      style={{ width: 200, borderColor: 'var(--color-accent)' }}
    >
      {url ? (
        <img src={url} className="w-full block" draggable={false} />
      ) : (
        <div className="w-full h-[120px]" />
      )}
    </div>
  );
}

/* ── Galeria principal ── */
export function Gallery() {
  const {
    activeView, attachments, referencies, repositoris,
    loadAttachmentsForView, getVisibleReferencies, getRepositori,
    reorderReferencies, deleteAttachment, renameAttachment,
    ingestFiles, createReferencia,
  } = useDadesStore();
  const { addToast } = useUIStore();

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Comptador enter/leave: el dragleave salta a cada fill que es travessa
  const [dragDepth, setDragDepth] = useState(0);

  // Cerca i filtre per etiquetes — es reinicien en canviar de vista
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const repoId = activeView.mode === 'repositori' ? activeView.id : null;
  const activeRepositori = repoId ? getRepositori(repoId) : undefined;

  useEffect(() => {
    setQuery('');
    setSelectedTags([]);
  }, [activeView]);

  // «/» enfoca el cercador des de qualsevol lloc de la galeria
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || editingId || viewerIndex !== null) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingId, viewerIndex]);

  // Els adjunts de la vista es (re)carreguen quan canvia la vista o les dades
  useEffect(() => {
    loadAttachmentsForView();
  }, [activeView, referencies.length, loadAttachmentsForView]);

  const visibles = getVisibleReferencies();

  // === Filtres: cerca (títol/nota/domini/etiquetes) + etiquetes en AND ===

  const filtering = query.trim() !== '' || selectedTags.length > 0;

  const filtered = useMemo(() => {
    if (!filtering) return visibles;
    const q = norm(query.trim());
    return visibles.filter(r => {
      if (selectedTags.length > 0 && !selectedTags.every(t => r.tags.includes(t))) return false;
      if (!q) return true;
      return (
        norm(r.title).includes(q) ||
        norm(r.note).includes(q) ||
        norm(domainOf(r.url)).includes(q) ||
        r.tags.some(t => norm(t).includes(q))
      );
    });
  }, [visibles, filtering, query, selectedTags]);

  // Les etiquetes de la vista (sense filtrar), amb comptador, per als chips
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of visibles) {
      for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [visibles]);

  // Llista plana per al visor: tots els adjunts de la vista filtrada, en ordre de galeria
  const viewerList = useMemo(
    () => filtered.flatMap(r => attachmentsOfRef(r, attachments)),
    [filtered, attachments],
  );

  const coverOf = (referencia: Referencia): Attachment | null =>
    attachmentsOfRef(referencia, attachments)[0] ?? null;

  const openCard = (referencia: Referencia) => {
    const cover = coverOf(referencia);
    if (cover) {
      setViewerIndex(viewerList.findIndex(a => a.id === cover.id));
    } else if (referencia.url) {
      // Fitxa només d'enllaç: obre la font
      const href = referencia.url.includes('://') ? referencia.url : `https://${referencia.url}`;
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  const isRepositoriView = activeView.mode === 'repositori';
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // === Ingesta: fitxers deixats anar o enganxats a la vista de repositori ===

  const handleIngest = async (files: File[]) => {
    if (!repoId || files.length === 0) return;
    const { created, rejected } = await ingestFiles(repoId, files);
    if (created > 0) {
      addToast({ type: 'success', message: `${created} referènci${created === 1 ? 'a afegida' : 'es afegides'}` });
    }
    if (rejected.length > 0) {
      addToast({
        type: 'warning',
        message: `Rebutjat${rejected.length === 1 ? '' : 's'}: ${rejected.join(', ')} (només imatges/PDF fins a 20 MB)`,
      });
    }
  };

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('Files')) e.preventDefault();
    },
    onDragEnter: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        setDragDepth(d => d + 1);
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('Files')) setDragDepth(d => Math.max(0, d - 1));
    },
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      setDragDepth(0);
      const files = [...e.dataTransfer.files];
      if (!repoId) {
        addToast({ type: 'info', message: 'Obre un repositori per afegir-hi fitxers' });
        return;
      }
      await handleIngest(files);
    },
  };

  // Cmd+V: imatges del porta-retalls → referències noves; un enllaç de text →
  // referència d'enllaç. Només a la vista de repositori i fora de camps de text.
  useEffect(() => {
    if (!repoId) return;
    const onPaste = (e: ClipboardEvent) => {
      if (editingId || viewerIndex !== null) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;

      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length > 0) {
        e.preventDefault();
        handleIngest(files);
        return;
      }
      const text = e.clipboardData?.getData('text')?.trim() ?? '';
      const looksLikeUrl = /^(https?:\/\/\S+|www\.\S+|[\w-]+(\.[\w-]+)+(\/\S*)?)$/i.test(text);
      if (looksLikeUrl) {
        e.preventDefault();
        createReferencia(repoId, { url: text }).then(() => {
          addToast({ type: 'success', message: `Enllaç afegit (${domainOf(text) || text})` });
        });
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId, editingId, viewerIndex]);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    if (!isRepositoriView || activeView.mode !== 'repositori') return;
    // Amb filtre actiu no es reordena: escriuríem un referenceOrder retallat
    if (filtering) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = filtered.map(r => r.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    reorderReferencies(activeView.id, arrayMove(ids, from, to));
  };

  const draggedRef = activeDragId ? filtered.find(r => r.id === activeDragId) : null;
  const editingRef = editingId ? referencies.find(r => r.id === editingId) : null;

  // Vel que apareix mentre s'arrossega un fitxer per sobre de la galeria
  const dragVeil = dragDepth > 0 && activeRepositori && (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      style={{ paddingLeft: LEFTBAR_W }}
    >
      <div className="absolute inset-y-0 right-0" style={{ left: LEFTBAR_W, background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative rounded-2xl px-8 py-6 text-center"
        style={{ border: '2px dashed var(--color-accent)', background: 'rgba(0,0,0,0.5)' }}
      >
        <p className="text-white text-sm font-medium">
          Deixa anar per afegir a «{activeRepositori.name}»
        </p>
        <p className="text-white/40 text-[11px] mt-1">Imatges i PDFs, fins a 20 MB</p>
      </div>
    </div>
  );

  if (repositoris.length > 0 && visibles.length === 0) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ paddingLeft: LEFTBAR_W + 24 }}
        {...dropHandlers}
      >
        <p className="text-sm text-white/25 text-center max-w-[360px]">
          {isRepositoriView
            ? 'Aquest repositori encara és buit. Arrossega-hi imatges o PDFs, o enganxa\'ls amb Cmd+V (també un enllaç).'
            : 'Encara no hi ha cap referència en aquesta vista.'}
        </p>
        {dragVeil}
      </main>
    );
  }

  const cards = filtered.map(referencia => {
    const repositori = getRepositori(referencia.repositoriId);
    return (
      <GalleryCard
        key={referencia.id}
        referencia={referencia}
        cover={coverOf(referencia)}
        subtitle={isRepositoriView ? '' : repositori?.name ?? ''}
        sortable={isRepositoriView && !filtering}
        onOpen={() => openCard(referencia)}
        onEdit={() => setEditingId(referencia.id)}
      />
    );
  });

  return (
    <main
      className="min-h-screen"
      style={{ paddingLeft: LEFTBAR_W + 24, paddingRight: 24, paddingTop: 24, paddingBottom: 48 }}
      {...dropHandlers}
    >
      {/* Barra de cerca i etiquetes — enganxada a dalt mentre es fa scroll */}
      <div
        className="sticky top-0 z-30 -mx-2 px-2 pb-3 pt-2"
        style={{ background: 'linear-gradient(var(--color-black) 75%, transparent)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setQuery(''); (e.target as HTMLInputElement).blur(); }
              }}
              placeholder="Cerca…  ( / )"
              className="h-8 w-[200px] rounded-lg bg-[#1c1c1c] border border-white/10 focus:border-white/25 outline-none text-[12px] text-white placeholder-white/25 pl-8 pr-3 transition-colors"
            />
          </div>

          {/* Chips d'etiquetes de la vista, amb comptador; AND entre seleccionades */}
          {tagCounts.map(([tag, count]) => {
            const isOn = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTags(isOn ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag])
                }
                className="h-8 px-3 rounded-lg text-[11px] font-medium transition-colors"
                style={
                  isOn
                    ? { background: 'var(--color-accent)', color: '#1a1a1a' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }
                }
                title={isOn ? 'Treu el filtre' : 'Filtra per aquesta etiqueta'}
              >
                {tag}
                <span className="ml-1.5" style={{ opacity: 0.55 }}>{count}</span>
              </button>
            );
          })}

          {filtering && (
            <button
              onClick={() => { setQuery(''); setSelectedTags([]); }}
              className="h-8 flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition-colors"
              title="Neteja els filtres"
            >
              <X size={12} />
              {filtered.length} de {visibles.length}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
          <p className="text-sm text-white/25">Cap referència no coincideix amb el filtre.</p>
        </div>
      ) : (
      <div style={{ columnWidth: 250, columnGap: 16 }}>
        {isRepositoriView ? (
          <DndContext
            sensors={sensors}
            onDragStart={(e: DragStartEvent) => setActiveDragId(e.active.id as string)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            <SortableContext items={filtered.map(r => r.id)} strategy={rectSortingStrategy}>
              {cards}
            </SortableContext>
            <DragOverlay>
              {draggedRef ? <DragCard cover={coverOf(draggedRef)} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          cards
        )}
      </div>
      )}

      {/* Visor a pantalla completa — recorre tots els adjunts de la vista */}
      {viewerIndex !== null && viewerList[viewerIndex] && (
        <AttachmentViewer
          attachments={viewerList}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onRename={(id, name) => renameAttachment(id, name)}
          onDelete={id => deleteAttachment(id)}
        />
      )}

      {/* Fitxa d'edició de la referència */}
      {editingRef && (
        <ReferenciaModal
          key={editingRef.id}
          referencia={editingRef}
          onClose={() => setEditingId(null)}
        />
      )}

      {dragVeil}
    </main>
  );
}
