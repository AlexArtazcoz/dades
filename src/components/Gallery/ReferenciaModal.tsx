import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Star, Trash2, X } from 'lucide-react';
import { isImageAttachment, useAttachmentUrl } from '../Attachments/attachmentUtils';
import { useDadesStore } from '../../stores/dadesStore';
import { useUIStore } from '../../stores/uiStore';
import { MAX_FILE_BYTES, isAcceptedFile } from '../../constants';
import type { Attachment, Referencia } from '../../types';

/* La fitxa d'edició d'una referència. Títol, enllaç, nota i etiquetes es
   desen amb «Desa»; els fitxers (afegir, esborrar, triar portada) toquen la
   base immediatament, com el visor. */

const inputStyle: React.CSSProperties = {
  height: 40, borderRadius: 8, border: '0.5px solid var(--color-border)',
  paddingLeft: 10, fontSize: 13, outline: 'none', flexShrink: 0,
  margin: 0, background: 'transparent', fontWeight: 500, width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.4)',
  marginBottom: 6, display: 'block',
};

function Thumb({
  attachment,
  isCover,
  onMakeCover,
  onDelete,
}: {
  attachment: Attachment;
  isCover: boolean;
  onMakeCover: () => void;
  onDelete: () => void;
}) {
  const isImage = isImageAttachment(attachment);
  const url = useAttachmentUrl(isImage ? attachment : null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className="relative group/thumb rounded-lg overflow-hidden flex-shrink-0"
      style={{
        width: 72, height: 72,
        border: isCover ? '2px solid var(--color-accent)' : '0.5px solid var(--color-border)',
        background: '#F4F4F4',
      }}
      title={attachment.name}
    >
      {url ? (
        <img src={url} alt={attachment.name} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] font-semibold text-black/40">
          PDF
        </div>
      )}

      {/* Accions — apareixen sobre la miniatura */}
      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/45 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
        {!isCover && (
          <button
            onClick={onMakeCover}
            className="p-1 rounded-md bg-white/90 text-black/70 hover:text-black"
            title="Fes-la portada"
          >
            <Star size={13} />
          </button>
        )}
        <button
          onClick={() => {
            if (!confirming) { setConfirming(true); return; }
            onDelete();
          }}
          className={`p-1 rounded-md ${confirming ? 'bg-red-500 text-white' : 'bg-white/90 text-black/70 hover:text-red-500'}`}
          title={confirming ? 'Clica un altre cop per esborrar' : 'Esborra el fitxer'}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {isCover && (
        <span
          className="absolute bottom-0 inset-x-0 text-center text-[9px] font-semibold uppercase tracking-wide py-0.5"
          style={{ background: 'var(--color-accent)', color: 'var(--color-black)' }}
        >
          Portada
        </span>
      )}
    </div>
  );
}

export function ReferenciaModal({
  referencia,
  onClose,
}: {
  referencia: Referencia;
  onClose: () => void;
}) {
  const {
    attachments, updateReferencia, deleteReferencia,
    deleteAttachment, addAttachment,
  } = useDadesStore();
  const { addToast } = useUIStore();

  const [title, setTitle] = useState(referencia.title);
  const [url, setUrl] = useState(referencia.url);
  const [note, setNote] = useState(referencia.note);
  const [tags, setTags] = useState<string[]>(referencia.tags);
  const [tagDraft, setTagDraft] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // La referència viva de l'store: la portada i els fitxers canvien en calent
  const live = useDadesStore(s => s.referencies.find(r => r.id === referencia.id));
  const own = attachments
    .filter(a => a.referenciaId === referencia.id)
    .sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // La referència s'ha esborrat per sota (p. ex. des del visor) → tanca
  if (!live) {
    onClose();
    return null;
  }

  // Accepta el valor com a argument: el commit per coma arriba des d'onChange
  // abans que setTagDraft s'hagi aplicat, i llegir l'estat aquí perdria el text
  const commitTag = (value?: string) => {
    const t = (value ?? tagDraft).trim().replace(/,+$/, '');
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft('');
  };

  const handleSave = async () => {
    await updateReferencia(referencia.id, {
      title: title.trim(),
      url: url.trim(),
      note: note.trim(),
      tags,
    });
    onClose();
  };

  const handleAddFiles = async (files: File[]) => {
    let added = 0;
    for (const file of files) {
      if (!isAcceptedFile(file) || file.size > MAX_FILE_BYTES) {
        addToast({ type: 'warning', message: `«${file.name}» rebutjat (només imatges/PDF fins a 20 MB)` });
        continue;
      }
      if (await addAttachment(referencia.id, file)) added++;
    }
    if (added > 0) addToast({ type: 'success', message: `${added} fitxer${added === 1 ? '' : 's'} afegit${added === 1 ? '' : 's'}` });
  };

  const handleDeleteReferencia = async () => {
    if (!confirmingDelete) { setConfirmingDelete(true); return; }
    await deleteReferencia(referencia.id);
    addToast({ type: 'success', message: 'Referència esborrada' });
    onClose();
  };

  /* Portal a body: la galeria té stacking context propi (z-index 25) i, sense
     portal, cap z-index tret d'aquí no pot passar per sobre de la barra. */
  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(18,18,17,0.22)' }} />
      <div
        style={{
          position: 'fixed',
          left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(440px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          borderRadius: 16,
          border: '0.5px solid var(--color-border)',
          background: 'white',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 8px 40px rgba(18,18,17,0.18)',
          animation: 'ref-dialog-in 0.25s cubic-bezier(0.2, 0, 0, 1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-headline)', fontSize: 18, textTransform: 'uppercase' }}>
            Referència
          </span>
        </div>

        <div>
          <label style={labelStyle}>Títol</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Sense títol"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Enllaç</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://…"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Nota</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Per què val la pena recordar-la…"
            rows={3}
            style={{ ...inputStyle, height: 'auto', paddingTop: 8, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        <div>
          <label style={labelStyle}>Etiquetes</label>
          <div
            className="flex flex-wrap items-center gap-1.5"
            style={{ ...inputStyle, height: 'auto', minHeight: 40, padding: 6, cursor: 'text' }}
            onClick={() => document.getElementById('tag-input')?.focus()}
          >
            {tags.map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium"
                style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-text)' }}
              >
                {tag}
                <button onClick={() => setTags(tags.filter(t => t !== tag))} title="Treu l'etiqueta">
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              id="tag-input"
              type="text"
              value={tagDraft}
              onChange={e => {
                const value = e.target.value;
                if (value.endsWith(',')) commitTag(value);
                else setTagDraft(value);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitTag(); }
                if (e.key === 'Backspace' && !tagDraft && tags.length) setTags(tags.slice(0, -1));
              }}
              onBlur={() => commitTag()}
              placeholder={tags.length === 0 ? 'poster, tipografia…' : ''}
              style={{ flex: 1, minWidth: 80, border: 'none', outline: 'none', fontSize: 12, background: 'transparent' }}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Fitxers</label>
          <div className="flex flex-wrap gap-2">
            {own.map(attachment => (
              <Thumb
                key={attachment.id}
                attachment={attachment}
                isCover={live.coverAttachmentId === attachment.id}
                onMakeCover={() => updateReferencia(referencia.id, { coverAttachmentId: attachment.id })}
                onDelete={() => deleteAttachment(attachment.id)}
              />
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center rounded-lg text-black/30 hover:text-black/60 transition-colors flex-shrink-0"
              style={{ width: 72, height: 72, border: '1px dashed #D0D0D0' }}
              title="Afegeix fitxers"
            >
              <Plus size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={async e => {
                const files = [...(e.target.files ?? [])];
                e.target.value = '';
                await handleAddFiles(files);
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexShrink: 0, marginTop: 2 }}>
          <button
            onClick={handleDeleteReferencia}
            style={{
              height: 40, borderRadius: 8, padding: '0 14px',
              border: confirmingDelete ? 'none' : '0.5px solid #F1C4C4',
              background: confirmingDelete ? '#DC2626' : 'transparent',
              color: confirmingDelete ? 'white' : '#DC2626',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            {confirmingDelete ? 'Segur?' : 'Esborra'}
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              height: 40, borderRadius: 8, padding: '0 14px',
              border: '0.5px solid var(--color-border)', background: 'transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#7C7C7C',
            }}
          >
            Cancel·la
          </button>
          <button
            onClick={handleSave}
            style={{
              height: 40, borderRadius: 8, padding: '0 18px',
              background: 'var(--color-accent)', color: 'var(--color-black)',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            Desa
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
