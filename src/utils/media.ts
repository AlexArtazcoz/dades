/* Enllaços i vídeo.

   Una referència pot ser tres coses: fitxers pujats (imatge, PDF, vídeo), un
   enllaç a una web, o un vídeo d'una plataforma (YouTube, Vimeo). Els dos
   últims no ocupen res: es guarda l'adreça i la miniatura ve de la font. */

export function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return '';
  return u.includes('://') ? u : `https://${u}`;
}

export function domainOf(url: string): string {
  if (!url) return '';
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Sembla una adreça? (l'enganxat del porta-retalls i el camp d'enllaç)
export function looksLikeUrl(text: string): boolean {
  return /^(https?:\/\/\S+|www\.\S+|[\w-]+(\.[\w-]+)+(\/\S*)?)$/i.test(text.trim());
}

export interface VideoEmbed {
  provider: 'youtube' | 'vimeo';
  id: string;
  embedUrl: string;
  /* Miniatures per ordre de preferència: si la primera no existeix (hi ha
     vídeos sense maxres, o sense hqdefault) es prova la següent. */
  thumbUrls: string[];
}

/* Reconeix els formats de YouTube (watch?v=, youtu.be, /embed/, /shorts/) i
   Vimeo. Retorna null per a qualsevol altre enllaç. */
export function videoEmbedOf(rawUrl: string): VideoEmbed | null {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    return id ? youtube(id) : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = parsed.searchParams.get('v');
    if (v) return youtube(v);
    const m = parsed.pathname.match(/^\/(?:embed|shorts|v|live)\/([^/?#]+)/);
    if (m) return youtube(m[1]);
    return null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = parsed.pathname.match(/(\d+)/);
    if (m) {
      return {
        provider: 'vimeo',
        id: m[1],
        embedUrl: `https://player.vimeo.com/video/${m[1]}`,
        // Vimeo demana una crida a la seva API per a la miniatura: no en posem
        thumbUrls: [],
      };
    }
  }
  return null;
}

function youtube(id: string): VideoEmbed {
  return {
    provider: 'youtube',
    id,
    // nocookie: no deixa galetes de seguiment a qui només mira l'arxiu
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    thumbUrls: [
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    ],
  };
}
