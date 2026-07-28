import { useDadesStore } from '../stores/dadesStore';

/* La pàgina que explica què és això. És una vista més de l'arxiu, no una
   finestra emergent: es navega igual que un sector i la barra n'ensenya el
   títol. Text sol, en una columna estreta, amb la mateixa veu tipogràfica
   que la resta. */

function Titol({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="uppercase text-[11px] tracking-[0.14em] mb-3"
      style={{ fontFamily: 'var(--font-headline)', color: 'var(--color-accent-text)' }}
    >
      {children}
    </h2>
  );
}

function Bloc({ titol, children }: { titol: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <Titol>{titol}</Titol>
      <div className="text-[14px] leading-[1.75] text-[var(--color-black)] space-y-3">
        {children}
      </div>
    </section>
  );
}

export function Sobre() {
  const { sectors, repositoris, referencies, readOnly } = useDadesStore();

  return (
    <main className="gallery-sheet">
      <div className="mx-auto" style={{ maxWidth: 560, paddingTop: 8, paddingBottom: 64 }}>

        {/* Sense uppercase: en majúscules el nom perd la D d'«ego death» */}
        <h1
          className="mb-8"
          style={{ fontFamily: 'var(--font-headline)', fontSize: 42, lineHeight: 1 }}
        >
          EgoDe
        </h1>

        <p className="text-[16px] leading-[1.7] mb-12 text-[var(--color-black)]">
          El nom ve d'<i>ego death</i>. Al darrere hi ha una idea senzilla: qualsevol
          persona pot fer art, vingui d'on vingui i hagi fet el camí que hagi fet.
          Aquí es guarden les obres, no els noms de qui les signa.
        </p>

        <Bloc titol="Què és">
          <p>
            Un arxiu de referències visuals. Coses que m'han fet aturar-me: cartells,
            edificis, tipografies, pàgines, objectes, fotografies. Les vaig afegint a
            mesura que les trobo, sense més criteri que aquest.
          </p>
          <p>
            De moment hi ha sobretot disseny i arquitectura. La intenció és que hi
            acabi cabent l'art en general, tot al mateix lloc.
          </p>
        </Bloc>

        <Bloc titol="Com està ordenat">
          <p>
            Tres nivells. Un <b>sector</b> és un àmbit ampli —disseny, arquitectura—.
            Dins de cada sector hi ha <b>repositoris</b>, que són una font o un tema
            concret: un estudi, una revista, una obsessió. I dins de cada repositori,
            les <b>referències</b>, cadascuna amb les seves imatges, l'enllaç a
            l'original i, quan cal, una nota del perquè hi és.
          </p>
          <p>
            Des del menú pots veure un repositori sol, un sector sencer o tot alhora.
          </p>
        </Bloc>

        <Bloc titol="Qui hi pot tocar">
          <p>
            L'arxiu el mantinc jo: hi afegeixo referències i les publico. Qui entra ho
            veu exactament igual i pot obrir cada referència i moure les fitxes com li
            vingui de gust —res del que faci canvia el que veuen els altres—.
          </p>
          {readOnly && (
            <p className="text-[var(--color-text-muted)]">
              Ara mateix l'estàs mirant així: pots remenar tot el que vulguis.
            </p>
          )}
        </Bloc>

        <Bloc titol="D'on ve la idea">
          <p>
            De HIC (<i>hic et nunc</i>, aquí i ara), l'arxiu que Jordi Badia i l'equip
            de BAAS mantenen des del 2008 a Barcelona. Publiquen les arquitectures que
            els han cridat l'atenció i prou, i amb els anys allò s'ha convertit en un
            arxiu que fan servir arquitectes i estudiants que no tenen res en comú tret
            de la curiositat. Aquesta és la mida que m'interessa.
          </p>
        </Bloc>

        {sectors.length > 0 && (
          <p className="text-[12px] text-[var(--color-text-muted)] pt-2">
            {referencies.length} referènci{referencies.length === 1 ? 'a' : 'es'} ·{' '}
            {repositoris.length} repositori{repositoris.length === 1 ? '' : 's'} ·{' '}
            {sectors.length} sector{sectors.length === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </main>
  );
}
