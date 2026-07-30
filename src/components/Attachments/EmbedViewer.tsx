import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';
import type { VideoEmbed } from '../../utils/media';

/* Reproductor a pantalla completa per als vídeos enllaçats (YouTube, Vimeo).
   Els vídeos pujats van pel visor d'adjunts; aquests no tenen fitxer, només
   una adreça, i es reprodueixen dins d'un iframe de la plataforma. */

export function EmbedViewer({
  embed,
  title,
  sourceUrl,
  onClose,
}: {
  embed: VideoEmbed;
  title: string;
  sourceUrl: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div className="att-viewer" onClick={onClose}>
      <div className="att-viewer-backdrop" />

      <div className="att-viewer-bar" onClick={e => e.stopPropagation()}>
        <div className="att-viewer-meta">
          <span className="att-viewer-name" style={{ cursor: 'default' }}>{title}</span>
          <span className="att-viewer-sub">{embed.provider}</span>
        </div>
        <div className="att-viewer-actions">
          <button
            className="att-viewer-btn"
            title="Obrir a la font"
            onClick={() => window.open(sourceUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={16} />
          </button>
          <button className="att-viewer-btn" title="Tancar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="att-viewer-stage" onClick={e => e.stopPropagation()}>
        <div style={{ width: 'min(100%, 1200px)', aspectRatio: '16 / 9' }}>
          <iframe
            src={`${embed.embedUrl}?autoplay=1&rel=0`}
            title={title}
            style={{ width: '100%', height: '100%', border: 0, borderRadius: 8 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
