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

- [x] **Fase 0 — Neteja i rebatejat**
  Fora tot el codi de vídeo/LLM (generació, proxy de Vite, modals, wordCount)
  i també la UI vella sencera (Storyboard, SceneCard, Sidebar, LeftBar,
  SettingsModal, scriptStore): les fases 2-3 la refaran adaptant-la des del
  repo de SceneScript, que queda com a referència. El visor d'adjunts viu ara
  a `src/components/Attachments/`. App mínima: inicialitza la BD, toasts i
  botó de restaurar còpia. Base de Pages `/dades/`, dev al port 5174.
- [x] **Fase 1 — Model de dades v1**
  `types/index.ts` i `db.ts` nous de dalt a baix: `DadesDB` amb taules
  sectors/repositoris/referencies/attachments, validadors amb backfill, CRUD
  amb esborrats en cascada, export/import amb adjunts en base64. `backup.ts`
  adaptat al model nou. **Totes les claus de localStorage porten prefix
  `dades_`**: a GitHub Pages l'app compartirà origen amb SceneScript i sense
  prefix es trepitjarien la configuració. Verificat per consola: CRUD,
  export → clear → import amb blob intacte byte a byte, backfill de camps
  absents i cascada sector → repositori → referència → adjunt. Lint a zero
  (els 3 errors heretats eren al db.ts vell).
- [x] **Fase 2 — Store i menú lateral**
  `dadesStore` (Zustand+immer) amb sectors/repositoris/referències, CRUD
  sincronitzat amb Dexie i **vista activa** persistida a localStorage
  (`{mode: 'tot' | 'sector' | 'repositori'}`) amb `getVisibleReferencies()`
  a punt per a la galeria. Sidebar adaptada de SceneScript: entrada "Tot",
  sectors amb el desplegable esglaonat mostrant "Tot el sector" + repositoris
  (emoji, comptador, doble clic per renombrar, edita/esborra al hover amb
  doble confirmació), modal blanc compartit per crear/editar sectors i
  repositoris (nom, emoji; + enllaç i descripció als repositoris). LeftBar:
  boli amb menú d'importa/exporta, pill amb el comptador de referències de la
  vista, títol vertical (repositori en blanc + sector en taronja, amb
  l'ajust d'alçada heretat) i hamburguesa. Verificat al navegador: crear
  sector i repositori, seleccions, persistència de la vista en recarregar,
  doble confirmació d'esborrat i consola neta.
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
  Pages amb base `/dades/`. El workflow està en manual (`workflow_dispatch`)
  fins que hi hagi Pages: recuperar llavors el disparador de push. Pendent
  d'Alex: crear el repo `dades-backup`, activar Pages (repo privat → cal pla
  de pagament o fer públic `dades`) i generar el token fine-grained.

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
