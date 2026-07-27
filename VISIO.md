# EgoDe — stress test i encaix de la visió

Document d'avaluació, 27 de juliol del 2026. Respon dues preguntes: **fins on
aguanta el codi actual** i **si l'arquitectura d'ara serveix per a la idea
d'EgoDe** (un arxiu de referència d'art i disseny obert al públic, en la línia
de HIC — Hic et Nunc).

## 1. Stress test — mesures reals

Fetes al navegador contra el codi de producció, sembrant referències amb
imatges JPEG reals (~690 KB de mitjana) i mesurant les rutes crítiques.

| Referències | Còpia (`exportAllData`) | JSON generat | Pic de memòria |
|---|---|---|---|
| 62 | 1,6 s | 59 MB | +17 MB |
| 182 | 5,9 s | 172 MB | +128 MB |

Altres mesures:

- **Inserció**: 69 referències/segon amb la base buida → **2,4/segon** a les 260.
  Una caiguda de 29×. Causes: cada inserció reescriu `referenceOrder` sencer i
  torna a pintar totes les fitxes de la galeria.
- **Renderitzat**: 182 fitxes en 108 ms. **Aquesta part va bé** — el navegador
  descodifica les imatges mandrosament. No és el coll d'ampolla.
- **Quota del navegador**: 1,6 GB en aquesta màquina.
- **`navigator.storage.persisted()` = false** → el navegador pot **esborrar la
  base** quan vagi curt d'espai. Per a un arxiu, això és risc de pèrdua real.

### Diagnòstic

El coll d'ampolla és **la còpia de seguretat, no la interfície**. `doBackup()`
crida `exportAllData()` —que passa **totes** les imatges a base64— *abans* de
comparar l'empremta per decidir si cal copiar. És a dir: **cada 3 minuts
codifica l'arxiu sencer només per adonar-se que no ha canviat res.** El cost
creix amb tot el que tens guardat, no amb el que has tocat.

Extrapolant la corba: cap a **500 referències** la còpia triga ~20 s i mou
~500 MB; cap a **1.000** peta la pestanya. Sumat a la quota d'1,6 GB, el
sostre real d'aquesta arquitectura és de l'ordre de **300–500 referències**.
HIC en té milers.

### Arreglos concrets (dins del disseny actual)

1. **Calcular l'empremta abans de codificar**, i codificar només els adjunts
   nous o canviats. Elimina ~95 % del cost i és el canvi més rendible de tots.
2. **`navigator.storage.persist()`** en arrencar. Una línia, i tapa el risc de
   pèrdua de dades.
3. **Inserció en lot** a la ingesta (una escriptura de `referenceOrder` i un
   sol repintat per tanda, no un per fitxer).
4. Virtualitzar la graella quan es passi del miler de fitxes.

Amb l'1 i el 2 fets, el sostre puja còmodament a uns quants milers.

## 2. Encaix de la visió

### El que ja encaixa (i no s'ha de refer)

- **El model de continguts.** Sector → Repositori → Referència → fitxers, amb
  etiquetes, calca l'estructura de HIC: les seves 4 categories (Classics,
  Academic, Things, Books) són **sectors**; els seus llistats d'arquitectes i
  ciutats són **índexs sobre etiquetes**. Això ja hi és.
- **L'experiència de lectura.** Graella masonry + visor a pantalla completa és
  exactament la manera de mirar un arxiu visual.
- **La ingesta.** Arrossegar i Cmd+V és la manera correcta de curar de pressa.

### El que no encaixa (i no s'arregla afinant)

L'app d'ara és **una llibreta privada d'un sol usuari**. EgoDe és **un arxiu
públic i enllaçable**. No és una funcionalitat que falti: és que les dades
van en una altra direcció.

| El que demana EgoDe | El que passa ara |
|---|---|
| Un visitant obre l'enllaç i veu l'arxiu | Veu l'app **buida** — les dades són al teu navegador |
| Enllaçar una referència o un autor | No hi ha URLs: tot és una sola pàgina |
| Que Google indexi cada projecte | No hi ha res indexable |
| Llistats A–Z per autor, ciutat, disciplina | Les etiquetes hi són al model, però sense filtre a la vista |
| Popularitat (vistes, més consultats) | Impossible sense servidor |
| Més d'un curador | Un sol token = un sol editor |

### La proposta: separar l'editor del publicat

No convertir una app en les dues coses. Partir-ho en tres peces, **mantenint
el model de dades que ja tens**:

1. **L'editor** — el que ja funciona. Privat, local, teu. És on cures.
2. **Publicar** — un botó que escriu un dataset públic (JSON + imatges
   redimensionades) a un repositori públic. És **el mateix codi de
   `backup.ts`** apuntant a un altre repositori i passant les imatges per un
   redimensionador. Feina petita, perquè la part difícil (Git Data API,
   pujar només el que ha canviat) ja està escrita i provada.
3. **El web públic** — un lloc **estàtic** que llegeix aquell dataset i genera
   una pàgina per referència, per autor i per etiqueta, amb URLs de veritat i
   metadades per compartir. Amb **Astro**, que ja fas servir al portfoli.
   Gratis a Pages, ràpid i indexable.

La popularitat demana un bocí de servidor (un comptador *serverless* al pla
gratuït fa el fet). Val la pena deixar-la per al final: **HIC no té
popularitat, té criteri** — el valor és la selecció, no el rànquing.

### La decisió que ho condiciona tot

La frase de la idea és que *tothom pugui crear art*. Això admet dues lectures
molt diferents, i convé triar aviat perquè no costen el mateix:

- **Arxiu curat per tu** (com HIC, que curen Jordi Badia i BAAS): l'obertura
  és qui hi *surt*, no qui hi *publica*. El camí estàtic de dalt ho resol
  sencer, costa 0 € i es manté sol.
- **Plataforma on la gent puja obra**: comptes, moderació, emmagatzematge,
  costos recurrents i responsabilitat legal. És un producte molt més gran, i
  ja no és aquesta base de codi sinó una de nova amb servidor.

La primera lectura es pot començar demà amb el que hi ha. La segona és un
projecte a part.

## 3. Pendent de decidir

- **Nom del repositori i URL.** El títol visible ja és EgoDe, però el repo i
  l'adreça segueixen sent `dades` (https://alexartazcoz.github.io/dades/).
  Canviar-ho és fàcil (`gh repo rename`, `base` del Vite i el repo de còpies),
  però **trenca l'enllaç actual** i obliga a reconfigurar el token. Es fa quan
  vulguis, en un sol pas.
- **La icona** és una D. Si el nom es queda com EgoDe, té sentit passar-la a E
  (o deixar-la, perquè la D hi és a dins).
