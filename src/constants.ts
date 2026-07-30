/* Amplada de la barra esquerra — única font de veritat per al llenç.
   En pantalles petites la barra és més estreta (72px sota els 640 d'amplada,
   110 altrament). Es calcula un cop per càrrega: girar el mòbil demana un
   refresc. Cap mòbil real fa menys de 330px: una amplada menor és un viewport
   encara sense assentar (p. ex. una WebView arrencant) i es tracta com a
   escriptori. */
const VIEWPORT_W =
  typeof window === 'undefined' || window.innerWidth < 330 ? 1280 : window.innerWidth;

export const LEFTBAR_W = VIEWPORT_W <= 640 ? 72 : 110;

/* Ingesta de fitxers: imatges, PDFs i vídeo.
   El vídeo té un límit més ampli perquè qualsevol clip decent passa de 20 MB;
   per sobre d'això val més enllaçar-lo (YouTube/Vimeo), que no ocupa res. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

export const ACCEPT_ATTR = 'image/*,application/pdf,video/*';

export function isAcceptedFile(file: File): boolean {
  return (
    file.type.startsWith('image/') ||
    file.type === 'application/pdf' ||
    file.type.startsWith('video/')
  );
}

// El límit que toca segons el tipus
export function maxBytesFor(file: File): number {
  return file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
}

/* L'arxiu públic de goDe. Va en un repositori a part del codi: així publicar
   no embruta la història del codi i les imatges viuen separades.
   Es serveix per GitHub Pages sota el mateix domini que l'app
   (alexartazcoz.github.io), o sigui mateix origen i cap problema de CORS. */
export const ARXIU_REPO = 'AlexArtazcoz/egode-arxiu';
export const ARXIU_PUBLIC_URL = 'https://alexartazcoz.github.io/egode-arxiu/';

/* Costat llarg màxim de les imatges publicades. L'original es queda a la
   còpia privada; el públic va lleuger perquè carregui de pressa. */
export const ARXIU_MAX_PX = 1600;
export const ARXIU_JPEG_Q = 0.82;
