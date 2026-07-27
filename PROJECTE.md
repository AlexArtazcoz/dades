# Dades — base de dades visual de referències

Estat del projecte i pla de treball. Aquest fitxer és el punt de partida per a
qualsevol sessió nova: llegeix-lo abans de tocar res.

## Context

Còpia del codi de SceneScript (`~/Desktop/Claude/Investing/scenescript`, al seu
torn còpia de `halfof8/script-app-oss`) transformada en una **base de dades
visual de referències**. On SceneScript té projectes, aquí hi ha **repositoris
de referències** agrupats per **sectors** (p. ex. sector "Disseny" → repositori
"halfof8").

Usuari: Alex. Objectiu: quan busqui inspiració, veure totes les referències
d'un cop d'ull — imatges grans, en graella, sense haver d'entrar a cap web.
Els fitxers (imatges, PDFs) els puja ell a cada referència.

- Local: `~/Desktop/Claude/Investing/dades`
- Repo GitHub: pendent de crear (`AlexArtazcoz/dades`, privat)
- Stack heretat: React 19 + TypeScript + Vite + Tailwind 4 + Zustand + Dexie (IndexedDB) + dnd-kit
- Idioma dels commits i de la UI: català

## Model conceptual

| SceneScript | Dades | Exemple |
|---|---|---|
| Projecte | **Repositori** | halfof8 |
| Fase (categoria) | **Sector** (agrupa repositoris al menú) | Disseny |
| Columna (escena) | **Referència** | un pòster, una web, un edifici |
| Adjunt | **Fitxer** de la referència | captures, imatges, PDFs |

- **Sector**: agrupació al menú lateral (Disseny, Arquitectura, Fotografia…).
  Creables i renombrables. Un repositori pertany a un sol sector.
- **Repositori**: base de referències d'una font o tema (un estudi, un autor,
  una tècnica). Té nom, emoji, enllaç opcional a la font i descripció curta.
- **Referència**: la unitat de contingut. Títol, enllaç opcional, nota lliure,
  etiquetes i **fitxers adjunts** (les imatges que es veuen a la graella).
  La primera imatge fa de portada.

El llenç principal deixa de ser un tauler horitzontal de columnes i passa a ser
una **graella tipus masonry** (estil Pinterest/Are.na): només imatges, a mida
gran, amb el títol i el domini de l'enllaç en passar-hi per sobre. Clic → visor
a pantalla completa (el d'adjunts de SceneScript, reaprofitat) amb fletxes per
recórrer tota la vista activa.

Tres nivells de vista: **repositori** (les seves referències), **sector**
(totes les dels seus repositoris barrejades) i **tot** (tota la base, per
navegar buscant inspiració).

## Què es reaprofita i què marxa

Reutilitzat tal qual o amb retocs mínims:
- `SceneCard/attachmentUtils.ts` — `useBlobUrl`, `downloadBlob`, `formatBytes`
- `SceneCard/AttachmentViewer.tsx` — visor a pantalla completa (PDF + imatges,
  tira de miniatures, ←/→, reanomenar, descarregar); passa a navegar per la
  galeria activa en lloc de per la columna
- `services/db.ts` — patró Dexie sencer (validadors amb backfill, export/import
  amb base64, taula d'adjunts separada); esquema nou v1, BD nova `dades-db`
- `services/backup.ts` — còpia al GitHub via Git Data API, idèntica (repo de
  còpies propi: `dades-backup`)
- `components/Sidebar` — patró del menú (llista + desplegable animat): sectors
  que despleguen els seus repositoris
- `components/LeftBar` — barra negra amb comptadors, import/export i configuració
- `ToastContainer`, `SettingsModal` (sense la part d'OpenAI), `index.css`
  (llenguatge visual sencer: tipografia Archivo, taronja, animacions)
- `.github/workflows/deploy.yml` — Pages amb base `/dades/`

S'esborra (tot el que és vídeo/LLM):
- `services/generation.ts`, dependència `openai`, `ApiKeyModal`,
  `YTDescriptionModal`, `utils/wordCount.ts`, `FitIndicator`,
  `DraftNotesPager`, narracions/esborranys/versions del model de dades
- `Storyboard.tsx` com a tauler de columnes (el substitueix la galeria; el
  drag & drop de dnd-kit es manté per reordenar referències)

## Model de dades v1 (esquema nou, sense llegat)

```ts
Sector      { id, name, emoji, order, createdAt }
Repositori  { id, sectorId, name, emoji, sourceUrl?, description,
              referenceOrder: string[], createdAt, updatedAt }
Referencia  { id, repositoriId, title, url?, note, tags: string[],
              coverAttachmentId?, createdAt, updatedAt }
Attachment  { id, referenciaId, repositoriId, name, mimeType, size,
              createdAt, blob }   // taula pròpia, com a SceneScript
```

Es manté la disciplina de `SCHEMA_MIGRATIONS.md` des del primer dia
(`CURRENT_SCHEMA_VERSION = 1`).

## Fases del pla

- [ ] **Fase 0 — Neteja i rebatejat**
  Esborrar el codi de vídeo/LLM llistat a dalt, treure `openai` del
  `package.json`, rebatejar l'app a "Dades" (títol, `index.html`, LeftBar),
  BD Dexie nova, `git init` + primer commit com a línia base. `npm run build`
  verd i app arrencant amb pantalla buida.
- [ ] **Fase 1 — Model de dades v1**
  Tipus nous, esquema Dexie v1 amb validadors i backfill, CRUD complet,
  export/import amb adjunts en base64. Sense UI encara: verificat per consola.
- [ ] **Fase 2 — Store i menú lateral**
  `dadesStore` (Zustand) amb sectors/repositoris/referències. Sidebar:
  sectors desplegables amb els seus repositoris (patró del desplegable de
  fases), crear/renombrar/esborrar amb doble confirmació, emoji, comptador de
  referències. LeftBar amb totals de la vista activa.
- [ ] **Fase 3 — Galeria visual**
  Graella masonry al llenç (CSS columns, imatges amb `useBlobUrl`), hover amb
  títol + domini, clic → visor a pantalla completa navegant per tota la vista.
  Les tres vistes: repositori, sector i tot. Reordenar amb dnd-kit dins d'un
  repositori.
- [ ] **Fase 4 — Ingesta ràpida**
  Arrossegar fitxers (multi) directament a la graella → crea referències amb
  el fitxer com a portada; enganxar imatges des del porta-retalls (Cmd+V);
  fitxa d'edició de la referència (títol, enllaç, nota, etiquetes, més
  fitxers). Límit 20 MB per fitxer, com a SceneScript.
- [ ] **Fase 5 — Filtres i cerca**
  Cerca per títol/nota/domini, filtre per etiquetes (chips), barreja
  d'etiquetes entre repositoris a la vista sector/tot.
- [ ] **Fase 6 — Còpia de seguretat i desplegament**
  Backup al GitHub (repo `dades-backup`) reutilitzant `backup.ts`, workflow de
  Pages amb base `/dades/`. Pendent d'Alex: crear els dos repos i el token
  fine-grained, com a SceneScript.

## Convencions i traps (heretades de SceneScript)

- Qualsevol canvi d'esquema segueix `SCHEMA_MIGRATIONS.md`; el backfill va
  **dins dels validadors** — si un validador retorna false, s'esborra tota la BD.
- Els fitxers van a la taula `attachments`: mai dins de `Referencia` (les
  referències es reescriuen a cada tecla).
- Object URLs sempre amb `useBlobUrl` (creació i revocació al mateix efecte;
  StrictMode els mata si no).
- Verificació al navegador amb les eines de preview abans de donar res per bo;
  `npm run build` net.
- Commits en català, un per fase, push després de cada fase.

## Com arrencar

```bash
npm --prefix ~/Desktop/Claude/Investing/dades run dev
```
