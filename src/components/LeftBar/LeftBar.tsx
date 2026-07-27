import { useLayoutEffect, useRef, useState } from 'react';
import { PenIcon, MenuIcon, ImportMenuIcon, ExportMenuIcon } from '../Icons';
import { useDadesStore } from '../../stores/dadesStore';
import { useUIStore } from '../../stores/uiStore';
import { exportAllData, importAllData, downloadJson, pickAndReadJsonFile } from '../../services/db';

export function LeftBar() {
  const { sectors, repositoris, activeView, getSector, getRepositori, getVisibleReferencies, loadAll } =
    useDadesStore();
  const { sidebarOpen, sidebarClosing, toggleSidebar, addToast } = useUIStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [importing, setImporting] = useState(false);

  const titleAreaRef = useRef<HTMLDivElement>(null);
  const titleInnerRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setMenuClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
    }, 150);
  };

  // Títol i subtítol de la vista activa
  const repositori = activeView.mode === 'repositori' ? getRepositori(activeView.id) : undefined;
  const sector =
    activeView.mode === 'sector' ? getSector(activeView.id)
    : repositori ? getSector(repositori.sectorId)
    : undefined;
  const title =
    activeView.mode === 'tot' ? (sectors.length > 0 ? 'Tot' : '')
    : repositori?.name ?? sector?.name ?? '';
  const subtitle = repositori ? sector?.name ?? '' : '';

  const visibles = getVisibleReferencies();

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

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      downloadJson(data);
      addToast({
        type: 'success',
        message: `Exportats ${data.repositoris.length} repositoris i ${data.referencies.length} referències`,
      });
    } catch {
      addToast({ type: 'error', message: 'L\'exportació ha fallat' });
    }
    closeMenu();
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      const data = await pickAndReadJsonFile();
      await importAllData(data, 'replace');
      await loadAll();
      addToast({ type: 'success', message: 'Importació completada' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg !== 'Cancelled') {
        addToast({ type: 'error', message: msg || 'La importació ha fallat' });
      }
    } finally {
      setImporting(false);
      closeMenu();
    }
  };

  return (
    <div className={`left-bar fixed left-0 top-0 bg-[var(--color-black)] border-r border-[#383838] z-30 flex flex-col ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarClosing ? 'sidebar-closing' : ''}`}>
      {/* ── Part alta ── */}
      <div className="flex flex-col items-center w-full shrink-0">

        {/* Separador superior — mateixa alineació que SceneScript */}
        <div className="h-[80px]" />

        {/* Boli — obre el menú d'import/export */}
        <div className="relative flex items-center justify-center h-[48px]">
          <button
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
            className="text-white hover:text-[var(--color-accent)] transition-colors"
            title="Menú"
          >
            <PenIcon forceHovered={menuOpen} />
          </button>

          {/* Menú desplegable — squircle */}
          {menuOpen && (
            <div className={`generate-menu absolute left-full ml-2 top-0 z-50${menuClosing ? ' is-closing' : ''}`}>
              <button onClick={handleImport} disabled={importing} className="generate-menu-item disabled:opacity-40">
                <ImportMenuIcon size={24} />
                Importa
              </button>
              <button onClick={handleExport} className="generate-menu-item">
                <ExportMenuIcon size={24} />
                Exporta
              </button>
            </div>
          )}
        </div>

        <div className="h-[66px]" />

        {/* Comptador de la vista activa — el pill on SceneScript tenia el runtime */}
        {(sectors.length > 0 || repositoris.length > 0) && (
          <div className="flex justify-center relative w-full">
            <span
              className="subheading"
              style={{
                color: 'white',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 10,
                padding: '7px 12px',
                lineHeight: 1,
              }}
              title="Referències a la vista"
            >
              {visibles.length} ref
            </span>
          </div>
        )}

        <div className="h-[40px]" />
      </div>

      {/* ── Títol vertical de la vista activa ── */}
      <div
        ref={titleAreaRef}
        className="left-bar-title-area flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden"
      >
        <div ref={titleInnerRef}>
          {title && (
            <div className="w-full flex flex-col items-center gap-[16px]">
              <span
                className="text-white uppercase whitespace-nowrap origin-center"
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
                    color: 'var(--color-accent)',
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
              ? 'text-[var(--color-accent)]'
              : 'text-[#9A9A9A] hover:text-[var(--color-accent)]'
          }`}
          title="Sectors"
        >
          <MenuIcon size={24} />
        </button>
      </div>

      {/* Clic fora per tancar el menú */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={closeMenu} />
      )}
    </div>
  );
}
