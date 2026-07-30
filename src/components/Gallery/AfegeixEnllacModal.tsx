import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { looksLikeUrl, videoEmbedOf, domainOf } from '../../utils/media';

/* Afegir una referència d'enllaç sense passar per l'ordinador: al mòbil no hi
   ha ni arrossegar ni Cmd+V, i aquest és l'únic camí per posar-hi una web o un
   vídeo de YouTube. */

const inputStyle: React.CSSProperties = {
  height: 40, borderRadius: 8, border: '0.5px solid var(--color-border)',
  paddingLeft: 10, fontSize: 13, outline: 'none', flexShrink: 0,
  margin: 0, background: 'transparent', fontWeight: 500, width: '100%',
  boxSizing: 'border-box',
};

export function AfegeixEnllacModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (url: string, title: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const valid = looksLikeUrl(url);
  const embed = valid ? videoEmbedOf(url) : null;

  const submit = () => {
    if (valid) onSave(url.trim(), title.trim());
  };

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
          width: 'min(400px, calc(100vw - 32px))',
          borderRadius: 16,
          border: '0.5px solid var(--color-border)',
          background: 'white',
          padding: 16,
          display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 8px 40px rgba(18,18,17,0.18)',
          animation: 'ref-dialog-in 0.25s cubic-bezier(0.2, 0, 0, 1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-headline)', fontSize: 18, textTransform: 'uppercase' }}>
            Nou enllaç
          </span>
        </div>

        <input
          ref={urlRef}
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Enganxa l'adreça (web o YouTube)"
          style={inputStyle}
        />

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Títol (opcional)"
          style={inputStyle}
        />

        {url.trim() !== '' && (
          <p style={{ fontSize: 10, lineHeight: 1.5, color: 'rgba(0,0,0,0.35)', margin: 0 }}>
            {embed
              ? `Vídeo de ${embed.provider}: es veurà amb la seva miniatura i es reproduirà dins de l'arxiu.`
              : valid
              ? `Enllaç a ${domainOf(url)}.`
              : 'Això no sembla una adreça.'}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, height: 40, borderRadius: 8,
              border: '0.5px solid var(--color-border)', background: 'transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#7C7C7C',
            }}
          >
            Cancel·la
          </button>
          <button
            onClick={submit}
            disabled={!valid}
            style={{
              flex: 1, height: 40, borderRadius: 8,
              background: valid ? 'var(--color-accent)' : '#EFEDE8',
              color: valid ? 'var(--color-black)' : '#A8A59E',
              border: 'none', cursor: valid ? 'pointer' : 'default',
              fontSize: 13, fontWeight: 500,
            }}
          >
            Afegeix
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
