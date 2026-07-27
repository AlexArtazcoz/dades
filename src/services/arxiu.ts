import { ARXIU_JPEG_Q, ARXIU_MAX_PX, ARXIU_PUBLIC_URL, ARXIU_REPO } from '../constants';
import { gh, bytesToBase64, gitBlobSha, hasBackupConfig } from './backup';
import { getAllSectors, getAllRepositoris, getAllReferencies, getAllAttachments } from './db';
import type { Attachment, Referencia, Repositori, Sector } from '../types';

/* L'arxiu públic d'EgoDe.

   Publicar: escriu el dataset curat (data.json + imatges redimensionades) al
   repositori públic amb la Git Data API, igual que la còpia de seguretat però
   apuntant a un altre lloc i amb les imatges alleugerides. Les que no han
   canviat no es tornen a pujar.

   Llegir: qualsevol visitant fa un fetch del data.json. No hi ha token ni
   IndexedDB pel mig — les dades es queden a memòria i es miren, res més. */

// Qui té token configurat és qui cura; la resta del món només mira.
export function isCurator(): boolean {
  return hasBackupConfig();
}

// === El que viatja al fitxer públic ===

interface ArxiuAttachment {
  id: string;
  referenciaId: string;
  repositoriId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
  path: string; // relatiu a l'arrel de l'arxiu, p. ex. "img/<id>.jpg"
}

interface ArxiuDataset {
  version: 1;
  publishedAt: number;
  sectors: Sector[];
  repositoris: Repositori[];
  referencies: Referencia[];
  attachments: ArxiuAttachment[];
}

export interface PublishResult {
  referencies: number;
  imatges: number;
  pujades: number;
  skipped: boolean;
}

// === Publicar ===

/* Redueix una imatge al costat llarg màxim i la torna en JPEG. Els PDFs i
   qualsevol cosa que no sigui imatge passen tal qual. */
async function shrink(attachment: Attachment): Promise<{ bytes: Uint8Array; ext: string; mime: string }> {
  const blob = attachment.blob;
  if (!blob) throw new Error(`L'adjunt ${attachment.name} no té contingut`);

  if (!attachment.mimeType.startsWith('image/')) {
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      ext: attachment.mimeType === 'application/pdf' ? 'pdf' : 'bin',
      mime: attachment.mimeType,
    };
  }

  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, ARXIU_MAX_PX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No s\'ha pogut preparar la imatge');
  // Fons blanc: els PNG amb transparència no han de sortir negres en JPEG
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const out = await new Promise<Blob | null>(res =>
    canvas.toBlob(res, 'image/jpeg', ARXIU_JPEG_Q),
  );
  if (!out) throw new Error('No s\'ha pogut comprimir la imatge');
  return { bytes: new Uint8Array(await out.arrayBuffer()), ext: 'jpg', mime: 'image/jpeg' };
}

interface TreeEntry {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: string;
}

/* Publica tot el que hi ha a la base al repositori públic. Un sol commit. */
export async function publishArxiu(
  onProgress?: (fet: number, total: number) => void,
): Promise<PublishResult> {
  if (!isCurator()) throw new Error('Cal el token per publicar');

  const [sectors, repositoris, referencies, attachments] = await Promise.all([
    getAllSectors(), getAllRepositoris(), getAllReferencies(), getAllAttachments(),
  ]);

  // Estat actual del repositori públic (per no repujar el que ja hi és)
  const ref = await gh<{ object: { sha: string } }>(`/repos/${ARXIU_REPO}/git/ref/heads/main`);
  const baseCommitSha = ref.object.sha;
  const baseCommit = await gh<{ tree: { sha: string } }>(
    `/repos/${ARXIU_REPO}/git/commits/${baseCommitSha}`,
  );
  const existing = await gh<{ tree: { path: string; sha: string }[] }>(
    `/repos/${ARXIU_REPO}/git/trees/${baseCommit.tree.sha}?recursive=1`,
  ).then(t => new Map(t.tree.map(e => [e.path, e.sha])));

  const tree: TreeEntry[] = [];
  const manifest: ArxiuAttachment[] = [];
  let pujades = 0;

  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    onProgress?.(i, attachments.length);
    const { bytes, ext, mime } = await shrink(a);
    const path = `img/${a.id}.${ext}`;

    // Si el sha coincideix amb el que ja hi ha al repositori, no cal pujar-lo
    const sha = await gitBlobSha(bytes);
    if (sha && existing.get(path) === sha) {
      tree.push({ path, mode: '100644', type: 'blob', sha });
    } else {
      const blob = await gh<{ sha: string }>(`/repos/${ARXIU_REPO}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: bytesToBase64(bytes), encoding: 'base64' }),
      });
      tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
      pujades++;
    }

    manifest.push({
      id: a.id, referenciaId: a.referenciaId, repositoriId: a.repositoriId,
      name: a.name, mimeType: mime, size: bytes.length, createdAt: a.createdAt, path,
    });
  }

  const dataset: ArxiuDataset = {
    version: 1,
    publishedAt: Date.now(),
    sectors, repositoris, referencies,
    attachments: manifest,
  };
  const datasetBytes = new TextEncoder().encode(JSON.stringify(dataset));
  const datasetBlob = await gh<{ sha: string }>(`/repos/${ARXIU_REPO}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: bytesToBase64(datasetBytes), encoding: 'base64' }),
  });
  tree.push({ path: 'data.json', mode: '100644', type: 'blob', sha: datasetBlob.sha });

  // index.html perquè Pages serveixi el repositori i no doni 404 a l'arrel
  const indexPath = 'index.html';
  if (!existing.has(indexPath)) {
    const html = new TextEncoder().encode(
      '<!doctype html><meta charset="utf-8"><title>Arxiu EgoDe</title>' +
      '<p>Dades de l\'arxiu EgoDe. L\'app és a <a href="../dades/">/dades</a>.</p>\n',
    );
    const b = await gh<{ sha: string }>(`/repos/${ARXIU_REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: bytesToBase64(html), encoding: 'base64' }),
    });
    tree.push({ path: indexPath, mode: '100644', type: 'blob', sha: b.sha });
  }

  // .nojekyll: sense això Pages ignora fitxers i carpetes que comencen per _
  if (!existing.has('.nojekyll')) {
    const b = await gh<{ sha: string }>(`/repos/${ARXIU_REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: '', encoding: 'base64' }),
    });
    tree.push({ path: '.nojekyll', mode: '100644', type: 'blob', sha: b.sha });
  }

  // Arbre complet (sense base_tree): el que s'ha esborrat a l'app desapareix
  const newTree = await gh<{ sha: string }>(`/repos/${ARXIU_REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ tree }),
  });

  const commit = await gh<{ sha: string }>(`/repos/${ARXIU_REPO}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: `Publicació: ${referencies.length} referències, ${manifest.length} imatges`,
      tree: newTree.sha,
      parents: [baseCommitSha],
    }),
  });

  await gh(`/repos/${ARXIU_REPO}/git/refs/heads/main`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  });

  onProgress?.(attachments.length, attachments.length);
  return {
    referencies: referencies.length,
    imatges: manifest.length,
    pujades,
    skipped: false,
  };
}

// === Llegir (qualsevol visitant, sense token) ===

export interface PublicArxiu {
  sectors: Sector[];
  repositoris: Repositori[];
  referencies: Referencia[];
  attachments: Attachment[]; // amb `url`, sense blob
  publishedAt: number;
}

export async function loadPublicArxiu(): Promise<PublicArxiu | null> {
  try {
    const res = await fetch(`${ARXIU_PUBLIC_URL}data.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = (await res.json()) as ArxiuDataset;
    if (!data || !Array.isArray(data.sectors)) return null;

    return {
      sectors: data.sectors,
      repositoris: data.repositoris,
      referencies: data.referencies,
      attachments: data.attachments.map(a => ({
        id: a.id,
        referenciaId: a.referenciaId,
        repositoriId: a.repositoriId,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
        createdAt: a.createdAt,
        url: `${ARXIU_PUBLIC_URL}${a.path}`,
      })),
      publishedAt: data.publishedAt,
    };
  } catch {
    return null;
  }
}
