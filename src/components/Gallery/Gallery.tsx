import { useEffect, useMemo, useState } from 'react';
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
import { Link as LinkIcon } from 'lucide-react';
import { AttachmentViewer } from '../Attachments/AttachmentViewer';
import { isImageAttachment, useBlobUrl } from '../Attachments/attachmentUtils';
import { useDadesStore } from '../../stores/dadesStore';
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
}: {
  referencia: Referencia;
  cover: Attachment | null;
  subtitle: string; // nom del repositori (vistes sector/tot); '' per amagar-lo
  sortable: boolean;
  onOpen: () => void;
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
  } = useDadesStore();

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

  if (repositoris.length > 0 && visibles.length === 0) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ paddingLeft: LEFTBAR_W + 24 }}
      >
        <p className="text-sm text-white/25 text-center max-w-[360px]">
          {isRepositoriView
            ? 'Aquest repositori encara no té referències. La ingesta (arrossegar imatges, Cmd+V) arriba a la Fase 4.'
            : 'Encara no hi ha cap referència en aquesta vista.'}
        </p>
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
        onOpen={() => openCard(referencia)}
      />
    );
  });

  return (
    <main
      className="min-h-screen"
      style={{ paddingLeft: LEFTBAR_W + 24, paddingRight: 24, paddingTop: 32, paddingBottom: 48 }}
    >
      <div style={{ columnWidth: 250, columnGap: 16 }}>
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
      </div>

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
    </main>
  );
}
