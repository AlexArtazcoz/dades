import { useEffect, useState } from 'react';
import { LeftBar } from './components/LeftBar';
import { Sidebar } from './components/Sidebar';
import { Gallery } from './components/Gallery';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/ToastContainer';
import { useDadesStore } from './stores/dadesStore';
import { useUIStore } from './stores/uiStore';
import { initializeDatabase } from './services/db';
import { hasBackupConfig, restoreFromGitHub, startAutoBackup, syncWithRemote } from './services/backup';

function App() {
  const { loadAll, sectors, isLoading } = useDadesStore();
  const { addToast, sidebarOpen, setSidebarOpen } = useUIStore();
  const [restoring, setRestoring] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);

  // Initialize database and validate schema on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        addToast({
          type: 'error',
          message: 'No s\'ha pogut inicialitzar la base de dades',
        });
      }
    };
    init();
  }, [addToast]);

  // Load data after database is initialized
  useEffect(() => {
    if (dbInitialized) {
      loadAll();
    }
  }, [dbInitialized, loadAll]);

  // Còpies automàtiques al GitHub mentre l'app és oberta
  useEffect(() => {
    if (!dbInitialized) return;
    return startAutoBackup(message =>
      addToast({ type: 'warning', message: `Còpia automàtica fallida: ${message}` }),
    );
  }, [dbInitialized, addToast]);

  // Sincronització entre navegadors: en obrir l'app i cada cop que la pestanya
  // torna a primer pla, si al GitHub hi ha una còpia més nova es carrega sola.
  useEffect(() => {
    if (!dbInitialized) return;
    let lastCheck = 0;
    let cancelled = false;

    const check = async () => {
      if (Date.now() - lastCheck < 30_000) return; // no repetir a cada canvi de focus
      lastCheck = Date.now();
      try {
        const result = await syncWithRemote();
        if (cancelled) return;
        if (result === 'restored') {
          await loadAll();
          addToast({ type: 'success', message: 'Actualitzat amb la còpia del GitHub' });
        } else if (result === 'conflict') {
          addToast({
            type: 'warning',
            duration: 10000,
            message:
              'Hi ha canvis aquí i una còpia més nova al GitHub. A Configuració: «Restaura» (guanya el GitHub) o «Fes còpia ara» (guanya aquest navegador).',
          });
        }
      } catch (e) {
        console.error('[backup] sincronització fallida:', e);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dbInitialized, loadAll, addToast]);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { repositorisImported } = await restoreFromGitHub();
      await loadAll();
      addToast({
        type: 'success',
        message: `Còpia restaurada: ${repositorisImported} repositori${repositorisImported === 1 ? '' : 's'}`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: `No s'ha pogut restaurar: ${error instanceof Error ? error.message : 'error desconegut'}`,
      });
    } finally {
      setRestoring(false);
    }
  };

  if (!dbInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">{!dbInitialized ? 'Inicialitzant…' : 'Carregant…'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LeftBar />
      <Sidebar />
      <SettingsModal />
      <ToastContainer />

      {/* La galeria masonry de la vista activa */}
      {sectors.length > 0 && <Gallery />}

      {/* Base buida: benvinguda + restauració si hi ha còpia configurada */}
      {sectors.length === 0 && !sidebarOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center px-6 pointer-events-none" style={{ paddingLeft: 110 }}>
          <div className="pointer-events-auto w-full max-w-[400px] text-center text-[var(--color-black)]">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">EgoDe</h1>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)] mb-5">
              {hasBackupConfig()
                ? 'Aquest navegador no té cap sector, però hi ha una còpia de seguretat al GitHub.'
                : 'Base de referències visual. Crea el primer sector des del menú.'}
            </p>
            {hasBackupConfig() ? (
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="w-full max-w-[280px] px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[#b9a389] disabled:opacity-50 text-[var(--color-black)] rounded-lg font-medium text-sm transition-colors"
              >
                {restoring ? 'Restaurant…' : 'Restaura les dades'}
              </button>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-full max-w-[280px] px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[#b9a389] text-[var(--color-black)] rounded-lg font-medium text-sm transition-colors"
              >
                Obre el menú
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
