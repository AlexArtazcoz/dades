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
- [x] **Fase 3 — Galeria visual**
  `components/Gallery/Gallery.tsx`: graella masonry amb CSS columns
  (`columnWidth: 250`), fitxes amb portada (`coverAttachmentId` o primer
  adjunt), bloc "PDF" per a adjunts no-imatge i fitxa de text per a
  referències només d'enllaç (clic → obre la font). Vel de hover amb títol,
  domini i nom del repositori (a les vistes sector/tot; sempre visible en
  tàctil). Clic → `AttachmentViewer` reutilitzat tal qual amb la **llista
  plana de tots els adjunts de la vista** (fletxes/tira recorren tota la
  galeria; reanomenar i esborrar adjunts cablejats a l'store, amb ajust de
  portada en esborrar). Reordenació amb dnd-kit (rectSortingStrategy,
  activació a 8px perquè el clic no es mengi el drag) només a la vista de
  repositori; escriu `referenceOrder`. L'store carrega els adjunts per vista
  (`loadAttachmentsForView`, amb consultes `anyOf` per sector) i s'exposa
  com a `__store` a la consola en dev. Verificat al navegador amb dades
  sembrades: masonry a 4 columnes, visor amb navegació 1/8, ordre persistit
  després de recarregar i les tres vistes.
- [x] **Fase 4 — Ingesta ràpida**
  Només a la vista de repositori: **arrossegar fitxers** (multi) a la graella
  amb vel de puntejat taronja («Deixa anar per afegir a …»), i **Cmd+V** amb
  imatges del porta-retalls o un enllaç de text (crea una referència
  d'enllaç); a les altres vistes un drop avisa amb un toast. Filtre a
  `constants.ts`: imatges/PDF fins a `MAX_FILE_BYTES` (20 MB), amb toast
  del que es rebutja. `ingestFiles` i `addAttachment` a l'store (el primer
  fitxer es fa portada). **Fitxa d'edició** (llapis al hover de cada fitxa):
  títol, enllaç, nota, etiquetes amb chips (coma/Enter afegeix, Backspace
  treu l'última — el commit per coma passa el valor directament, llegir
  l'estat allà el perdia), miniatures dels fitxers amb triar portada i
  esborrar (doble clic de confirmació), afegir més fitxers, i esborrar la
  referència. El paste s'ignora dins de camps de text i amb modals oberts.
  Verificat al navegador: drop de 3 fitxers (2 creats, .txt rebutjat),
  paste d'imatge i d'enllaç, fitxa desada amb etiquetes i vel visible.
- [x] **Fase 5 — Filtres i cerca**
  Barra enganxosa a dalt de la galeria: cercador (títol, nota, domini i
  etiquetes; sense distingir accents ni majúscules — `norm()` amb NFD) i
  chips de totes les etiquetes de la vista amb comptador, **AND** entre
  seleccionades, indicador «n de m» amb neteja ràpida. La tecla `/` enfoca
  el cercador i Esc el buida. Els filtres es reinicien en canviar de vista i
  funcionen a les tres (a sector/tot barregen etiquetes de tots els
  repositoris). El visor recorre només el que passa el filtre. **La
  reordenació s'apaga mentre hi ha filtre actiu**: reordenar la llista
  retallada escriuria un `referenceOrder` amb només els elements visibles.
  Verificat al navegador: cerca «seccio» → «Secció constructiva», AND de
  chips (3d+tipografia → 1 de 7) i reinici en canviar de vista.
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
