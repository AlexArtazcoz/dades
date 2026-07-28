import { useLayoutEffect, useRef } from 'react';
import { MenuIcon } from '../Icons';
import { useDadesStore } from '../../stores/dadesStore';
import { useUIStore } from '../../stores/uiStore';

/* La barra esquerra: només el títol vertical de la vista i la hamburguesa.
   Res més — importar/exportar viuen a Configuració i el comptador s'ha tret
   perquè la galeria ja diu tota sola quantes referències hi ha. */

export function LeftBar() {
  const { activeView, getSector, getRepositori } = useDadesStore();
  const { sidebarOpen, sidebarClosing, toggleSidebar } = useUIStore();

  const titleAreaRef = useRef<HTMLDivElement>(null);
  const titleInnerRef = useRef<HTMLDivElement>(null);

  // Títol i subtítol de la vista activa
  const repositori = activeView.mode === 'repositori' ? getRepositori(activeView.id) : undefined;
  const sector =
    activeView.mode === 'sector' ? getSector(activeView.id)
    : repositori ? getSector(repositori.sectorId)
    : undefined;
  const title =
    activeView.mode === 'tot' ? 'Tot'
    : activeView.mode === 'sobre' ? 'Sobre'
    : repositori?.name ?? sector?.name ?? '';
  const subtitle = repositori ? sector?.name ?? '' : '';

  // Encongeix el títol vertical fins que capi a l'alçada que queda a la barra.
  // El text vertical escala amb el font-size, així que una passada de ràtio
  // l'encerta; per sota de MIN_TITLE_PX deixem d'encongir i la zona fa scroll.
  useLayoutEffect(() => {
    const area = titleAreaRef.current;
    const inner = titleInnerRef.current;
    if (!area || !inner) return;

    const MIN_TITLE_PX = 11;

    const fit = () => {
      area.style.setProperty('--leftbar-title-fit', 'var(--leftbar-title-size)');
      delete area.dataset.clipped;

      const span = inner.querySelector('span');
      const available = area.clientHeight;
      if (!span || !available) return;

      const base = parseFloat(getComputedStyle(span).fontSize);
      const natural = inner.offsetHeight;
      if (!natural || natural <= available) return;

      // Estimació per ràtio, i afinat d'1 en 1 px pels marges que no escalen.
      let fitted = Math.max(MIN_TITLE_PX, Math.floor(base * (available / natural)));
      area.style.setProperty('--leftbar-title-fit', `${fitted}px`);
      while (fitted > MIN_TITLE_PX && inner.offsetHeight > available) {
        fitted -= 1;
        area.style.setProperty('--leftbar-title-fit', `${fitted}px`);
      }

      // Encara no hi cap ni al mínim — fon la vora tallada perquè es llegeixi
      // com a scrollable i no com a trencat.
      if (inner.offsetHeight > available) area.dataset.clipped = 'true';
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [title, subtitle]);

  return (
    <div className={`left-bar fixed left-0 top-0 bg-[var(--color-bg)] border-r border-[var(--color-border)] z-30 flex flex-col ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarClosing ? 'sidebar-closing' : ''}`}>
      {/* ── Títol vertical de la vista activa — centrat a la columna ── */}
      <div
        ref={titleAreaRef}
        className="left-bar-title-area flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden"
      >
        <div ref={titleInnerRef}>
          {title && (
            <div className="w-full flex flex-col items-center gap-[16px]">
              <span
                className="text-[var(--color-black)] uppercase whitespace-nowrap origin-center"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: 'var(--leftbar-title-fit, var(--leftbar-title-size))',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  marginTop: '12px',
                }}
              >
                {title}
              </span>
              {subtitle && (
                <span
                  className="uppercase whitespace-nowrap origin-center"
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    color: 'var(--color-accent-text)',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Part baixa ── */}
      <div className="left-bar-bottom-icons flex flex-col items-center gap-2 pb-4 shrink-0">
        {/* Obre el calaix de sectors (hamburguesa) */}
        <button
          onClick={toggleSidebar}
          className={`p-2 transition-colors ${
            sidebarOpen
              ? 'text-[var(--color-accent-text)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-accent-text)]'
          }`}
          title="Sectors"
        >
          <MenuIcon size={24} />
        </button>
      </div>
    </div>
  );
}
