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
import { Link as LinkIcon, Pencil, Plus } from 'lucide-react';
import { AttachmentViewer } from '../Attachments/AttachmentViewer';
import { ReferenciaModal } from './ReferenciaModal';
import { isImageAttachment, useAttachmentUrl } from '../Attachments/attachmentUtils';
import { useDadesStore } from '../../stores/dadesStore';
import { useUIStore } from '../../stores/uiStore';
import { DEVICE_HAS_HOVER } from '../../utils/interaction';
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
  canEdit,
  onOpen,
  onEdit,
}: {
  referencia: Referencia;
  cover: Attachment | null;
  subtitle: string; // nom del repositori (vistes sector/tot); '' per amagar-lo
  sortable: boolean;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: referencia.id,
    disabled: !sortable,
  });

  const isImage = cover ? isImageAttachment(cover) : false;
  const url = useAttachmentUrl(cover && isImage ? cover : null);
  const domain = domainOf(referencia.url);
  const caption = referencia.title || domain || (cover ? cover.name : 'Sense títol');

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  // Peu en tinta per a les fitxes que no són una imatge: sobre paper, el vel
  // fosc del hover només té sentit a sobre d'una foto.
  const inkFooter = (
    <div className="px-3 pb-2.5 pt-1">
      <div className="text-[var(--color-black)] text-[12px] font-medium leading-tight truncate">
        {caption}
      </div>
      {(subtitle || (domain && referencia.title)) && (
        <div className="flex items-center gap-2">
          {domain && referencia.title && (
            <span className="text-[var(--color-text-faint)] text-[10px] truncate">{domain}</span>
          )}
          {subtitle && (
            <span
              className="text-[10px] uppercase tracking-wider truncate"
              style={{ color: 'var(--color-accent-text)' }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="gallery-card group relative rounded-xl overflow-hidden cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
      onClick={onOpen}
      title={caption}
    >
      {cover && isImage ? (
        url && <img src={url} alt={caption} className="w-full block" draggable={false} />
      ) : cover ? (
        /* Adjunt que no és imatge (PDF): bloc amb etiqueta */
        <>
          <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
            <span
              className="px-2 py-1 rounded-md text-[11px] tracking-widest"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-text)', fontFamily: 'var(--font-headline)' }}
            >
              PDF
            </span>
            <span className="text-[11px] max-w-[80%] truncate">{cover.name}</span>
          </div>
          {inkFooter}
        </>
      ) : (
        /* Referència sense fitxers: fitxa de text (enllaç o nota) */
        <>
          <div className="w-full min-h-[110px] flex flex-col justify-center gap-2 p-4 pb-2">
            <div className="flex items-center gap-2 text-[var(--color-text-faint)]">
              <LinkIcon size={13} />
              <span className="text-[11px] truncate">{domain || '—'}</span>
            </div>
            <span className="text-[var(--color-black)] text-[14px] leading-snug">
              {referencia.title || 'Sense títol'}
            </span>
            {referencia.note && (
              <span className="text-[var(--color-text-muted)] text-[12px] leading-snug line-clamp-3">
                {referencia.note}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="px-4 pb-3">
              <span
                className="text-[10px] uppercase tracking-wider truncate"
                style={{ color: 'var(--color-accent-text)' }}
              >
                {subtitle}
              </span>
            </div>
          )}
        </>
      )}

      {/* Llapis d'edició — només per a qui cura l'arxiu */}
      {canEdit && (
      <button
        onClick={e => { e.stopPropagation(); onEdit(); }}
        onPointerDown={e => e.stopPropagation()}
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-md bg-white/85 text-[var(--color-text-muted)] hover:text-[var(--color-black)] shadow-sm transition-all ${
          DEVICE_HAS_HOVER ? 'opacity-0 group-hover:opacity-100' : ''
        }`}
        title="Edita la referència"
      >
        <Pencil size={13} />
      </button>
      )}

      {/* Sobre una foto, el títol va en un vel fosc: és l'únic fons que no pot
          ser blanc, perquè la imatge de sota pot ser de qualsevol color. */}
      {cover && isImage && (
        <div
          className={`absolute inset-x-0 bottom-0 px-3 pt-8 pb-2.5 pointer-events-none transition-opacity duration-200 ${
            DEVICE_HAS_HOVER ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}
          style={{ background: 'linear-gradient(transparent, rgba(18,18,17,0.72))' }}
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
  const url = useAttachmentUrl(cover && isImageAttachment(cover) ? cover : null);
  return (
    <div
      className="rounded-xl overflow-hidden border-2 shadow-xl bg-[var(--color-surface)]"
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
    ingestFiles, createReferencia, readOnly,
  } = useDadesStore();
  const { addToast, sidebarOpen, sidebarClosing } = useUIStore();

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Comptador enter/leave: el dragleave salta a cada fill que es travessa
  const [dragDepth, setDragDepth] = useState(0);

  const repoId = activeView.mode === 'repositori' ? activeView.id : null;
  const activeRepositori = repoId ? getRepositori(repoId) : undefined;

  // Els adjunts de la vista es (re)carreguen quan canvia la vista o les dades
  useEffect(() => {
    loadAttachmentsForView();
  }, [activeView, referencies.length, loadAttachmentsForView]);

  const visibles = getVisibleReferencies();

  // Llista plana per al visor: tots els adjunts de la vista, en ordre de galeria
  const viewerList = useMemo(
    () => visibles.flatMap(r => attachmentsOfRef(r, attachments)),
    [visibles, attachments],
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
  // El foli es desplaça amb el calaix en lloc de quedar-s'hi a sota
  const sheetClass = `gallery-sheet${sidebarOpen ? ' sidebar-open' : ''}${
    sidebarClosing ? ' sidebar-closing' : ''
  }`;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // === Ingesta: fitxers deixats anar o enganxats a la vista de repositori ===

  // Al mòbil no hi ha arrossegar ni Cmd+V: el selector de fitxers fa la mateixa feina
  const ingestInputRef = useRef<HTMLInputElement>(null);

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

  const dropHandlers = readOnly ? {} : {
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
    if (!repoId || readOnly) return;
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
  }, [repoId, editingId, viewerIndex, readOnly]);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    if (!isRepositoriView || activeView.mode !== 'repositori') return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = visibles.map(r => r.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    reorderReferencies(activeView.id, arrayMove(ids, from, to));
  };

  const draggedRef = activeDragId ? visibles.find(r => r.id === activeDragId) : null;
  const editingRef = editingId ? referencies.find(r => r.id === editingId) : null;

  // Vel que apareix mentre s'arrossega un fitxer per sobre de la galeria
  const dragVeil = dragDepth > 0 && activeRepositori && (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      style={{ paddingLeft: 'var(--leftbar-w)' }}
    >
      <div
        className="absolute inset-y-0 right-0"
        style={{ left: 'var(--leftbar-w)', background: 'rgba(255,255,255,0.86)' }}
      />
      <div
        className="relative rounded-2xl px-8 py-6 text-center"
        style={{ border: '2px dashed var(--color-accent)', background: 'var(--color-surface)' }}
      >
        <p className="text-[var(--color-black)] text-sm font-medium">
          Deixa anar per afegir a «{activeRepositori.name}»
        </p>
        <p className="text-[var(--color-text-muted)] text-[11px] mt-1">Imatges i PDFs, fins a 20 MB</p>
      </div>
    </div>
  );

  const addFilesInput = isRepositoriView && !readOnly && (
    <input
      ref={ingestInputRef}
      type="file"
      accept="image/*,application/pdf"
      multiple
      className="hidden"
      onChange={async e => {
        const files = [...(e.target.files ?? [])];
        e.target.value = '';
        await handleIngest(files);
      }}
    />
  );

  if (repositoris.length > 0 && visibles.length === 0) {
    return (
      <main className={sheetClass + ' flex items-center justify-center'} {...dropHandlers}>
        <div className="text-center max-w-[360px]">
          <p className="text-sm text-[var(--color-text-muted)]">
            {isRepositoriView
              ? (readOnly
                  ? 'Aquest repositori encara no té res.'
                  : 'Aquest repositori encara és buit. Arrossega-hi imatges o PDFs, enganxa\'ls amb Cmd+V (també un enllaç), o toca el botó.')
              : 'Encara no hi ha cap referència en aquesta vista.'}
          </p>
          {isRepositoriView && !readOnly && (
            <button
              onClick={() => ingestInputRef.current?.click()}
              className="mt-4 text-sm text-black/50 hover:text-black/80 transition-colors px-4 py-2 rounded-lg"
              style={{ border: '1px dashed #D0D0D0' }}
            >
              + Afegeix imatges o PDFs
            </button>
          )}
        </div>
        {addFilesInput}
        {dragVeil}
      </main>
    );
  }

  const cards = visibles.map(referencia => {
    const repositori = getRepositori(referencia.repositoriId);
    return (
      <GalleryCard
        key={referencia.id}
        referencia={referencia}
        cover={coverOf(referencia)}
        subtitle={isRepositoriView ? '' : repositori?.name ?? ''}
        sortable={isRepositoriView}
        canEdit={!readOnly}
        onOpen={() => openCard(referencia)}
        onEdit={() => setEditingId(referencia.id)}
      />
    );
  });

  return (
    <main className={sheetClass} {...dropHandlers}>
      <div className="gallery-grid">
        {isRepositoriView ? (
          <DndContext
            sensors={sensors}
            onDragStart={(e: DragStartEvent) => setActiveDragId(e.active.id as string)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            <SortableContext items={visibles.map(r => r.id)} strategy={rectSortingStrategy}>
              {cards}
            </SortableContext>
            <DragOverlay>
              {draggedRef ? <DragCard cover={coverOf(draggedRef)} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          cards
        )}
        {isRepositoriView && !readOnly && (
          <button
            onClick={() => ingestInputRef.current?.click()}
            className="flex items-center justify-center rounded-lg text-black/30 hover:text-black/60 transition-colors"
            style={{ minHeight: 132, border: '1px dashed #D0D0D0' }}
            title="Afegeix imatges o PDFs"
          >
            <Plus size={22} />
          </button>
        )}
        {addFilesInput}
      </div>

      {/* Visor a pantalla completa — recorre tots els adjunts de la vista */}
      {viewerIndex !== null && viewerList[viewerIndex] && (
        <AttachmentViewer
          attachments={viewerList}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onRename={readOnly ? undefined : (id, name) => renameAttachment(id, name)}
          onDelete={readOnly ? undefined : id => deleteAttachment(id)}
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
