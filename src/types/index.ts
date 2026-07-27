// === Model de Dades ===
//
// Sector (Disseny, Arquitectura…)
//   └── Repositori (halfof8, un estudi, un autor…)
//         └── Referència (un pòster, una web, un edifici…)
//               └── Attachment (les imatges/PDFs que es veuen a la galeria)
//
// Els camps de text opcionals es guarden com a '' (mai undefined): els
// validadors de db.ts són més simples i el backfill és trivial.

export interface Sector {
  id: string;
  name: string;
  emoji: string; // '' = sense emoji
  order: number; // posició al menú lateral
  createdAt: number;
}

export interface Repositori {
  id: string;
  sectorId: string;
  name: string;
  emoji: string; // '' = sense emoji
  sourceUrl: string; // enllaç a la font (web de l'autor/estudi); '' = cap
  description: string;
  referenceOrder: string[]; // ids de referència en ordre de galeria
  createdAt: number;
  updatedAt: number;
}

export interface Referencia {
  id: string;
  repositoriId: string;
  title: string;
  url: string; // enllaç d'on surt la referència; '' = cap
  note: string;
  tags: string[];
  coverAttachmentId: string | null; // quina imatge fa de portada a la galeria
  createdAt: number;
  updatedAt: number;
}

// Un fitxer (PNG/JPG/WebP/GIF/SVG/PDF) adjuntat a una referència.
// Taula pròpia a Dexie: les referències es reescriuen a cada tecla premuda
// i els blobs no han de viatjar amb elles.
export interface Attachment {
  id: string;
  referenciaId: string;
  repositoriId: string; // desnormalitzat per carregar galeries i esborrats en cascada
  name: string;
  mimeType: string;
  size: number; // bytes
  createdAt: number;
  blob: Blob;
}

// L'adjunt tal com viatja per l'export/import JSON (Blob → base64)
export interface AttachmentExport {
  id: string;
  referenciaId: string;
  repositoriId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
  dataBase64: string;
}
