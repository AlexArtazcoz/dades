# Dades

Base de dades **visual** de referències: sectors (Disseny, Arquitectura…) que
agrupen repositoris (halfof8, un estudi, un autor…) plens de referències amb
imatges i PDFs, per veure tota la inspiració d'un cop d'ull sense entrar a cap
web.

Construïda sobre el codi de [SceneScript](https://github.com/halfof8/script-app-oss)
(via la còpia pròpia `AlexArtazcoz/scenescript`). Tot local-first: les dades
viuen a IndexedDB del navegador, amb còpia de seguretat opcional a un repo
privat de GitHub.

L'estat del projecte i el pla de treball són a [PROJECTE.md](PROJECTE.md).

## Stack

React 19 · TypeScript · Vite · Tailwind 4 · Zustand · Dexie (IndexedDB) · dnd-kit

## Desenvolupament

```bash
npm install
npm run dev
```

## Llicència

MIT, heretada del projecte original (vegeu [LICENSE](LICENSE)).
