import Dexie, { type Table } from 'dexie';
import type { Sector, Repositori, Referencia, Attachment, AttachmentExport } from '../types';

// Schema version - increment this when you change data structure
const CURRENT_SCHEMA_VERSION = 1;
// Totes les claus de localStorage porten el prefix "dades_": a GitHub Pages
// aquesta app i SceneScript comparteixen origen (alexartazcoz.github.io) i
// sense prefix es trepitjarien la configuració l'una a l'altra.
const SCHEMA_VERSION_KEY = 'dades_schema_version';

export class DadesDB extends Dexie {
  sectors!: Table<Sector>;
  repositoris!: Table<Repositori>;
  referencies!: Table<Referencia>;
  attachments!: Table<Attachment>;

  constructor() {
    super('DadesDB');

    // Version 1: esquema inicial (sectors → repositoris → referències + adjunts)
    this.version(1).stores({
      sectors: 'id, order',
      repositoris: 'id, sectorId, updatedAt',
      referencies: 'id, repositoriId',
      attachments: 'id, referenciaId, repositoriId',
    });
  }
}

// === Validadors ===
//
// Backfill DINS dels validadors, mai validació estricta de camps nous: si un
// validador retorna false, initializeDatabase esborra TOTA la base de dades.
// Un camp benigne que falti (importat d'un fitxer vell, estat parcial) es
// repara aquí mateix i la validació passa.

type AnyRec = Record<string, unknown>;

function validateSector(sector: AnyRec): boolean {
  if (typeof sector.emoji === 'undefined') sector.emoji = '';
  if (typeof sector.order !== 'number') sector.order = 0;
  return (
    typeof sector.id === 'string' &&
    typeof sector.name === 'string' &&
    typeof sector.createdAt === 'number'
  );
}

function validateRepositori(repositori: AnyRec): boolean {
  if (typeof repositori.emoji === 'undefined') repositori.emoji = '';
  if (typeof repositori.sourceUrl === 'undefined') repositori.sourceUrl = '';
  if (typeof repositori.description === 'undefined') repositori.description = '';
  if (!Array.isArray(repositori.referenceOrder)) repositori.referenceOrder = [];
  return (
    typeof repositori.id === 'string' &&
    typeof repositori.sectorId === 'string' &&
    typeof repositori.name === 'string' &&
    typeof repositori.createdAt === 'number' &&
    typeof repositori.updatedAt === 'number'
  );
}

function validateReferencia(referencia: AnyRec): boolean {
  if (typeof referencia.url === 'undefined') referencia.url = '';
  if (typeof referencia.note === 'undefined') referencia.note = '';
  if (!Array.isArray(referencia.tags)) referencia.tags = [];
  if (typeof referencia.coverAttachmentId === 'undefined') referencia.coverAttachmentId = null;
  return (
    typeof referencia.id === 'string' &&
    typeof referencia.repositoriId === 'string' &&
    typeof referencia.title === 'string' &&
    typeof referencia.createdAt === 'number' &&
    typeof referencia.updatedAt === 'number'
  );
}

// Check if we need to reset the database due to schema changes
async function checkSchemaVersion(): Promise<boolean> {
  const storedVersion = localStorage.getItem(SCHEMA_VERSION_KEY);

  if (!storedVersion) {
    // First time - store current version
    localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION.toString());
    return true; // Schema is valid
  }

  const stored = parseInt(storedVersion, 10);

  if (stored < CURRENT_SCHEMA_VERSION) {
    console.log(`Schema upgraded from v${stored} to v${CURRENT_SCHEMA_VERSION}`);
    localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION.toString());
    // Let Dexie handle the migration
    return true;
  }

  if (stored > CURRENT_SCHEMA_VERSION) {
    // User has newer data (e.g., from a newer version, then downgraded)
    console.warn('Data schema is newer than app version. Resetting database.');
    await clearAllData();
    localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION.toString());
    return false; // Data was reset
  }

  return true; // Versions match
}

// Initialize database and validate schema
export async function initializeDatabase(): Promise<void> {
  await checkSchemaVersion();

  // Validate existing data
  try {
    const sectors = (await db.sectors.toArray()) as unknown as AnyRec[];
    const repositoris = (await db.repositoris.toArray()) as unknown as AnyRec[];
    const referencies = (await db.referencies.toArray()) as unknown as AnyRec[];

    const valid =
      sectors.every(validateSector) &&
      repositoris.every(validateRepositori) &&
      referencies.every(validateReferencia);

    if (!valid) {
      console.warn('Invalid data structure detected. Clearing database.');
      await clearAllData();
      localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION.toString());
    }
  } catch (error) {
    console.error('Database validation failed:', error);
    await clearAllData();
    localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION.toString());
  }
}

export const db = new DadesDB();

// === Operacions de Sector ===

export async function getAllSectors(): Promise<Sector[]> {
  return db.sectors.orderBy('order').toArray();
}

export async function saveSector(sector: Sector): Promise<void> {
  await db.sectors.put(sector);
}

export async function deleteSector(id: string): Promise<void> {
  await db.transaction('rw', [db.sectors, db.repositoris, db.referencies, db.attachments], async () => {
    const repositoris = await db.repositoris.where('sectorId').equals(id).toArray();
    for (const repositori of repositoris) {
      await db.attachments.where('repositoriId').equals(repositori.id).delete();
      await db.referencies.where('repositoriId').equals(repositori.id).delete();
      await db.repositoris.delete(repositori.id);
    }
    await db.sectors.delete(id);
  });
}

// === Operacions de Repositori ===

export async function getAllRepositoris(): Promise<Repositori[]> {
  return db.repositoris.orderBy('updatedAt').reverse().toArray();
}

export async function getRepositori(id: string): Promise<Repositori | undefined> {
  return db.repositoris.get(id);
}

export async function saveRepositori(repositori: Repositori): Promise<void> {
  await db.repositoris.put(repositori);
}

export async function deleteRepositori(id: string): Promise<void> {
  await db.transaction('rw', [db.repositoris, db.referencies, db.attachments], async () => {
    await db.attachments.where('repositoriId').equals(id).delete();
    await db.referencies.where('repositoriId').equals(id).delete();
    await db.repositoris.delete(id);
  });
}

// === Operacions de Referència ===

// Tota la taula: el menú necessita comptadors per repositori i les vistes
// sector/tot barregen repositoris. A l'escala d'una base personal no cal lazy.
export async function getAllReferencies(): Promise<Referencia[]> {
  return db.referencies.toArray();
}

export async function getReferenciesForRepositori(repositoriId: string): Promise<Referencia[]> {
  return db.referencies.where('repositoriId').equals(repositoriId).toArray();
}

export async function getReferencia(id: string): Promise<Referencia | undefined> {
  return db.referencies.get(id);
}

export async function saveReferencia(referencia: Referencia): Promise<void> {
  await db.referencies.put(referencia);
}

export async function saveReferencies(referencies: Referencia[]): Promise<void> {
  await db.referencies.bulkPut(referencies);
}

export async function deleteReferencia(id: string): Promise<void> {
  await db.transaction('rw', [db.referencies, db.attachments], async () => {
    await db.attachments.where('referenciaId').equals(id).delete();
    await db.referencies.delete(id);
  });
}

// === Operacions d'Adjunt ===

export async function saveAttachment(attachment: Attachment): Promise<void> {
  await db.attachments.put(attachment);
}

export async function getAttachmentsForRepositori(repositoriId: string): Promise<Attachment[]> {
  return db.attachments.where('repositoriId').equals(repositoriId).toArray();
}

export async function getAttachmentsForReferencia(referenciaId: string): Promise<Attachment[]> {
  return db.attachments.where('referenciaId').equals(referenciaId).toArray();
}

export async function deleteAttachment(id: string): Promise<void> {
  await db.attachments.delete(id);
}

// Only touches the name — the blob is left untouched in IndexedDB.
export async function renameAttachment(id: string, name: string): Promise<void> {
  await db.attachments.update(id, { name });
}

// === Export / Import ===

export interface ExportData {
  version: number;
  exportedAt: number;
  sectors: Sector[];
  repositoris: Repositori[];
  referencies: Referencia[];
  attachments: AttachmentExport[];
}

// Blob ↔ base64 — chunked so large images/PDFs don't blow the call stack
async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function exportAllData(): Promise<ExportData> {
  const sectors = await db.sectors.toArray();
  const repositoris = await db.repositoris.toArray();
  const referencies = await db.referencies.toArray();
  const attachments = await db.attachments.toArray();

  const attachmentExports: AttachmentExport[] = [];
  for (const a of attachments) {
    const { blob, ...meta } = a;
    attachmentExports.push({ ...meta, dataBase64: await blobToBase64(blob) });
  }

  return {
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    sectors,
    repositoris,
    referencies,
    attachments: attachmentExports,
  };
}

export async function importAllData(
  data: ExportData,
  mode: 'merge' | 'replace' = 'replace',
): Promise<{ repositorisImported: number; referenciesImported: number }> {
  // Basic validation
  if (
    !data ||
    !Array.isArray(data.sectors) ||
    !Array.isArray(data.repositoris) ||
    !Array.isArray(data.referencies)
  ) {
    throw new Error('Invalid export file format');
  }

  // El mateix backfill que a l'arrencada: un fitxer d'una versió vella no ha
  // de fer petar l'import per un camp benigne que falti.
  const valid =
    (data.sectors as unknown as AnyRec[]).every(validateSector) &&
    (data.repositoris as unknown as AnyRec[]).every(validateRepositori) &&
    (data.referencies as unknown as AnyRec[]).every(validateReferencia);
  if (!valid) {
    throw new Error('Export file contains invalid records');
  }

  const attachments: Attachment[] = (data.attachments ?? []).map(a => {
    const { dataBase64, ...meta } = a;
    return { ...meta, blob: base64ToBlob(dataBase64, a.mimeType) };
  });

  if (mode === 'replace') {
    await clearAllData();
  }

  await db.transaction('rw', [db.sectors, db.repositoris, db.referencies, db.attachments], async () => {
    await db.sectors.bulkPut(data.sectors);
    await db.repositoris.bulkPut(data.repositoris);
    await db.referencies.bulkPut(data.referencies);
    if (attachments.length > 0) {
      await db.attachments.bulkPut(attachments);
    }
  });

  return {
    repositorisImported: data.repositoris.length,
    referenciesImported: data.referencies.length,
  };
}

export function downloadJson(data: ExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `dades-backup-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pickAndReadJsonFile(): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text) as ExportData;
        resolve(data);
      } catch {
        reject(new Error('Failed to read or parse file'));
      }
    };

    input.oncancel = () => reject(new Error('Cancelled'));
    input.click();
  });
}

// === Database Reset ===

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.sectors, db.repositoris, db.referencies, db.attachments], async () => {
    await db.sectors.clear();
    await db.repositoris.clear();
    await db.referencies.clear();
    await db.attachments.clear();
  });
}

// Development helper - force schema reset
export async function forceSchemaReset(): Promise<void> {
  console.log('Forcing database reset...');
  await clearAllData();
  localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION.toString());
  console.log(`Database cleared and schema version set to ${CURRENT_SCHEMA_VERSION}`);
  console.log('Reload the page to reinitialize.');
}

// === Vista activa (última oberta) — es restaura en tornar ===

const ACTIVE_VIEW_STORAGE_KEY = 'dades_active_view';

// La vista del llenç: tota la base, un sector sencer o un repositori concret
export type ActiveView =
  | { mode: 'tot' }
  | { mode: 'sector'; id: string }
  | { mode: 'repositori'; id: string };

export function getStoredActiveView(): ActiveView | null {
  try {
    const raw = localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveView;
    if (parsed.mode === 'tot') return parsed;
    if ((parsed.mode === 'sector' || parsed.mode === 'repositori') && typeof parsed.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredActiveView(view: ActiveView | null): void {
  if (view) {
    localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, JSON.stringify(view));
  } else {
    localStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
  }
}

// Expose helpers to browser console in development
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).resetDatabase = forceSchemaReset;
  (window as unknown as Record<string, unknown>).__db = {
    exportAllData,
    importAllData,
    clearAllData,
    getAllSectors,
    saveSector,
    deleteSector,
    getAllRepositoris,
    saveRepositori,
    deleteRepositori,
    getReferenciesForRepositori,
    saveReferencia,
    deleteReferencia,
    saveAttachment,
    getAttachmentsForReferencia,
    getAttachmentsForRepositori,
    deleteAttachment,
    renameAttachment,
  };
  console.log('💡 Development mode: Call resetDatabase() to force clear database');
}
