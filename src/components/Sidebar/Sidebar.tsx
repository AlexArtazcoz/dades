import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, X } from 'lucide-react';
import { Config50Icon, DeleteIcon, EditIcon, NewSceneIcon } from '../Icons';
import { useDadesStore } from '../../stores/dadesStore';
import { useUIStore } from '../../stores/uiStore';
import { DEVICE_HAS_HOVER } from '../../utils/interaction';
import type { Sector, Repositori } from '../../types';

/* ── Modal de sector / repositori ──
   Adaptat del ScriptSettingsModal de SceneScript: mateixa caixa blanca
   centrada dins del calaix, animació ref-dialog-in i Enter per desar. */

const inputStyle: React.CSSProperties = {
  height: 40, borderRadius: 8, border: '0.5px solid var(--color-border)',
  paddingLeft: 10, fontSize: 13, outline: 'none', flexShrink: 0,
  margin: 0, background: 'transparent', fontWeight: 500,
};

type ModalTarget =
  | { kind: 'create-sector' }
  | { kind: 'edit-sector'; sector: Sector }
  | { kind: 'create-repositori'; sectorId: string }
  | { kind: 'edit-repositori'; repositori: Repositori };

function EntityModal({
  target,
  onClose,
  onSave,
}: {
  target: ModalTarget;
  onClose: () => void;
  onSave: (fields: { name: string; emoji: string; sourceUrl: string; description: string }) => void;
}) {
  const isRepositori = target.kind === 'create-repositori' || target.kind === 'edit-repositori';
  const existing =
    target.kind === 'edit-sector' ? target.sector
    : target.kind === 'edit-repositori' ? target.repositori
    : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ??'');
  const [sourceUrl, setSourceUrl] = useState(
    target.kind === 'edit-repositori' ? target.repositori.sourceUrl : '',
  );
  const [description, setDescription] = useState(
    target.kind === 'edit-repositori' ? target.repositori.description : '',
  );
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const titles: Record<ModalTarget['kind'], string> = {
    'create-sector': 'Nou sector',
    'edit-sector': 'Edita el sector',
    'create-repositori': 'Nou repositori',
    'edit-repositori': 'Edita el repositori',
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      emoji: emoji.trim(),
      sourceUrl: sourceUrl.trim(),
      description: description.trim(),
    });
  };

  const isDisabled = !name.trim();
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(18,18,17,0.22)' }} />
      {/* Centrada dins del panell de 400px del calaix */}
      <div
        style={{
          position: 'fixed',
          // left és el CENTRE: l'animació ref-dialog-in acaba en
          // translate(-50%,-50%). En pantalles estretes es centra al viewport
          // en lloc del punt fix del calaix, que s'hi sortiria.
          left: 'min(235px, 50vw)', top: '50%', transform: 'translate(-50%, -50%)',
          width: 314,
          maxWidth: 'calc(100vw - 24px)',
          borderRadius: 16,
          border: '0.5px solid var(--color-border)',
          background: 'white',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 8px 40px rgba(18,18,17,0.18)',
          animation: 'ref-dialog-in 0.25s cubic-bezier(0.2, 0, 0, 1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-headline)', fontSize: 18, textTransform: 'uppercase' }}>
            {titles[target.kind]}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            onKeyDown={onEnter}
            placeholder="✦"
            title="Emoji (opcional)"
            style={{ ...inputStyle, width: 48, textAlign: 'center', paddingLeft: 0 }}
          />
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={onEnter}
            placeholder={isRepositori ? 'Nom (halfof8…)' : 'Nom (Disseny…)'}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>

        {isRepositori && (
          <>
            <input
              type="text"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Enllaç de la font (opcional)"
              style={inputStyle}
            />
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Descripció curta (opcional)"
              style={inputStyle}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, height: 40, borderRadius: 8,
              border: '0.5px solid var(--color-border)', background: 'transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#7C7C7C',
            }}
          >
            Cancel·la
          </button>
          <button
            onClick={handleSubmit}
            disabled={isDisabled}
            style={{
              flex: 1, height: 40, borderRadius: 8,
              background: isDisabled ? '#EFEDE8' : 'var(--color-accent)',
              color: isDisabled ? '#A8A59E' : 'var(--color-black)',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            {target.kind.startsWith('create') ? 'Crea' : 'Desa'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Sub-llista de repositoris — es desplega sota el sector amb l'esglaonat ── */
function RepositoriList({
  sector,
  isExpanded,
  onEditRepositori,
}: {
  sector: Sector;
  isExpanded: boolean;
  onEditRepositori: (repositori: Repositori) => void;
}) {
  const {
    activeView, setActiveView, getRepositorisForSector, countReferencies,
    updateRepositori, deleteRepositori, readOnly,
  } = useDadesStore();
  const { setSidebarOpen, addToast } = useUIStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  const repositoris = getRepositorisForSector(sector.id);

  const commitEdit = () => {
    if (editingId && draftName.trim()) {
      updateRepositori(editingId, { name: draftName.trim() });
    }
    setEditingId(null);
  };

  const selectView = (view: Parameters<typeof setActiveView>[0]) => {
    setActiveView(view);
    setSidebarOpen(false);
  };

  const isSectorViewActive = activeView.mode === 'sector' && activeView.id === sector.id;

  return (
    <div className={`script-categories ${isExpanded ? 'is-expanded' : ''}`}>
      <div>
        <div className="script-categories-inner">
          {/* Vista de tot el sector, barrejant els seus repositoris */}
          <button
            className={`script-category-item ${isSectorViewActive ? 'is-active' : ''}`}
            style={{ ['--i' as string]: 0 }}
            onClick={e => { e.stopPropagation(); selectView({ mode: 'sector', id: sector.id }); }}
          >
            Tot el sector
          </button>

          {repositoris.map((repositori, i) => {
            const isActive = activeView.mode === 'repositori' && activeView.id === repositori.id;
            const count = countReferencies(repositori.id);

            if (repositori.id === editingId) {
              return (
                <input
                  key={repositori.id}
                  ref={inputRef}
                  value={draftName}
                  maxLength={28}
                  onChange={e => setDraftName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                    e.stopPropagation();
                  }}
                  onClick={e => e.stopPropagation()}
                  className="script-category-item is-editing"
                  style={{ ['--i' as string]: i + 1 }}
                />
              );
            }

            if (repositori.id === confirmingId) {
              return (
                <div
                  key={repositori.id}
                  className="script-category-item"
                  style={{ ['--i' as string]: i + 1, display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-red-400">Esborrar?</span>
                  <button
                    onClick={async e => {
                      e.stopPropagation();
                      await deleteRepositori(repositori.id);
                      setConfirmingId(null);
                      addToast({ type: 'success', message: `Esborrat «${repositori.name}»` });
                    }}
                    className="px-2 py-0.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] rounded-md transition-colors"
                  >
                    Esborra
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmingId(null); }}
                    className="px-2 py-0.5 bg-black/[0.06] hover:bg-black/10 text-[var(--color-text-muted)] text-[11px] rounded-md transition-colors"
                  >
                    Cancel·la
                  </button>
                </div>
              );
            }

            return (
              <div
                key={repositori.id}
                className={`script-category-item group ${isActive ? 'is-active' : ''}`}
                style={{ ['--i' as string]: i + 1, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); selectView({ mode: 'repositori', id: repositori.id }); }}
                onDoubleClick={readOnly ? undefined : e => {
                  e.stopPropagation();
                  setEditingId(repositori.id);
                  setDraftName(repositori.name);
                }}
                title={readOnly ? repositori.name : 'Doble clic per renombrar'}
              >
                {repositori.emoji && <span>{repositori.emoji}</span>}
                <span className="truncate">{repositori.name}</span>
                {count > 0 && <span className="script-category-count">{count}</span>}

                {/* Edita / esborra — només per a qui cura l'arxiu */}
                {!readOnly && (
                <span
                  className="flex items-center gap-1 ml-auto"
                  style={DEVICE_HAS_HOVER ? undefined : { opacity: 1 }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); onEditRepositori(repositori); }}
                    className={`text-[var(--color-text-faint)] hover:text-[var(--color-black)] transition-all ${DEVICE_HAS_HOVER ? 'opacity-0 group-hover:opacity-100' : ''}`}
                    title="Edita"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmingId(repositori.id); }}
                    className={`text-[var(--color-text-faint)] hover:text-red-500 transition-all ${DEVICE_HAS_HOVER ? 'opacity-0 group-hover:opacity-100' : ''}`}
                    title="Esborra"
                  >
                    <X size={13} />
                  </button>
                </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Fila d'un sector ── */
function SectorItem({
  sector,
  isExpanded,
  confirmingDeleteId,
  onToggleExpand,
  onEdit,
  onNewRepositori,
  onEditRepositori,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  sector: Sector;
  isExpanded: boolean;
  confirmingDeleteId: string | null;
  onToggleExpand: (id: string) => void;
  onEdit: (sector: Sector) => void;
  onNewRepositori: (sectorId: string) => void;
  onEditRepositori: (repositori: Repositori) => void;
  onRequestDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const { activeView, getRepositorisForSector, readOnly } = useDadesStore();
  const [hovered, setHovered] = useState(false);
  const isConfirming = confirmingDeleteId === sector.id;

  // El punt taronja marca on és la vista activa
  const isActive =
    (activeView.mode === 'sector' && activeView.id === sector.id) ||
    (activeView.mode === 'repositori' &&
      getRepositorisForSector(sector.id).some(r => r.id === activeView.id));

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2 py-[8px] min-h-[40px]">
        <span
          className="flex-1 min-w-0 truncate text-red-400 text-[13px]"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          Esborrar el sector i tot el que conté?
        </span>
        <button
          onClick={() => onConfirmDelete(sector.id)}
          className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] rounded-md transition-colors"
        >
          Esborra
        </button>
        <button
          onClick={onCancelDelete}
          className="px-2.5 py-1 bg-black/[0.06] hover:bg-black/10 text-[var(--color-text-muted)] text-[11px] rounded-md transition-colors"
        >
          Cancel·la
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className="group flex items-center py-[8px] min-h-[40px] cursor-pointer relative"
        // En tàctil no seguim el hover: si el primer toc canvia l'estil,
        // iOS se'l queda com a "hover" i el clic no arriba mai.
        onMouseEnter={DEVICE_HAS_HOVER ? () => setHovered(true) : undefined}
        onMouseLeave={DEVICE_HAS_HOVER ? () => setHovered(false) : undefined}
        onClick={() => onToggleExpand(sector.id)}
      >
        {/* Punt indicador de vista activa — absolut per no moure el layout */}
        <div
          style={{
            position: 'absolute',
            left: -12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            opacity: isActive ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}
        />
        {/* Nom del sector */}
        <span
          className="flex-1 min-w-0 truncate text-[26px] leading-[1.05] uppercase transition-colors"
          style={{
            fontFamily: 'var(--font-headline)',
            color: (isActive || hovered) ? 'var(--color-accent-text)' : 'var(--color-black)',
          }}
        >
          {sector.emoji && <span className="mr-2">{sector.emoji}</span>}
          {sector.name}
        </span>

        {/* Icones de hover: esborra / edita / nou repositori — només curador */}
        {!readOnly && (
        <div
          className="flex items-center gap-1 flex-shrink-0"
          style={{
            opacity: hovered || !DEVICE_HAS_HOVER ? 1 : 0,
            transition: 'opacity 0.15s ease',
            pointerEvents: hovered || !DEVICE_HAS_HOVER ? 'auto' : 'none',
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); onRequestDelete(sector.id); }}
            className="p-0.5 text-[var(--color-text-faint)] hover:text-red-500 transition-colors"
            title="Esborra"
          >
            <DeleteIcon size={24} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit(sector); }}
            className="p-0.5 text-[var(--color-text-faint)] hover:text-[var(--color-black)] transition-colors"
            title="Edita"
          >
            <EditIcon size={24} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onNewRepositori(sector.id); }}
            className="p-0.5 text-[var(--color-text-faint)] hover:text-[var(--color-black)] transition-colors text-[20px] leading-none w-[26px]"
            title="Nou repositori"
          >
            +
          </button>
        </div>
        )}
      </div>

      {/* Repositoris del sector — es despleguen en clicar la fila */}
      <RepositoriList
        sector={sector}
        isExpanded={isExpanded}
        onEditRepositori={onEditRepositori}
      />
    </div>
  );
}

/* ── Sidebar principal ── */
export function Sidebar() {
  const {
    sectors, referencies, activeView, setActiveView,
    createSector, updateSector, deleteSector,
    createRepositori, updateRepositori,
  } = useDadesStore();

  const { sidebarOpen, sidebarClosing, setSidebarOpen, addToast, setSettingsModalOpen } = useUIStore();
  const readOnly = useDadesStore(s => s.readOnly);
  /* En públic el calaix no ensenya res d'edició. L'engranatge és l'única
     excepció i només amb #curador a l'adreça: és per on el curador entra el
     token en un navegador nou, que si no es quedaria tancat a fora. */
  const showSettings = !readOnly || window.location.hash === '#curador';

  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Quin sector ensenya els seus repositoris. Per defecte, el de la vista
  // activa; clicar un sector ho sobreescriu (null = tots plegats).
  const activeSectorId =
    activeView.mode === 'sector' ? activeView.id
    : activeView.mode === 'repositori'
      ? useDadesStore.getState().getRepositori(activeView.id)?.sectorId ?? null
    : null;
  const [expandedOverride, setExpandedOverride] = useState<string | null | undefined>(undefined);
  const expandedSectorId = expandedOverride === undefined ? activeSectorId : expandedOverride;

  const handleToggleExpand = (id: string) => {
    setExpandedOverride(expandedSectorId === id ? null : id);
  };

  const handleModalSave = async (fields: { name: string; emoji: string; sourceUrl: string; description: string }) => {
    if (!modalTarget) return;
    if (modalTarget.kind === 'create-sector') {
      await createSector(fields.name, fields.emoji);
      addToast({ type: 'success', message: `Creat «${fields.name}»` });
    } else if (modalTarget.kind === 'edit-sector') {
      await updateSector(modalTarget.sector.id, { name: fields.name, emoji: fields.emoji });
    } else if (modalTarget.kind === 'create-repositori') {
      const repositori = await createRepositori(modalTarget.sectorId, fields);
      setActiveView({ mode: 'repositori', id: repositori.id });
      setExpandedOverride(undefined);
      setSidebarOpen(false);
      addToast({ type: 'success', message: `Creat «${fields.name}»` });
    } else {
      await updateRepositori(modalTarget.repositori.id, fields);
    }
    setModalTarget(null);
  };

  const isTotActive = activeView.mode === 'tot';

  return (
    <>
      <div className={`scripts-sidebar ${sidebarOpen ? 'is-open' : ''} ${sidebarClosing ? 'is-closing' : ''}`}>
        <div className="flex flex-col h-full relative">

          {/* Llista de sectors — comença 94px des de dalt, com a SceneScript */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ paddingTop: '94px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '160px' }}
          >
            {/* Vista de tota la base */}
            <div className="mb-6">
              <div
                className="group flex items-center py-[8px] min-h-[40px] cursor-pointer relative"
                onClick={() => { setActiveView({ mode: 'tot' }); setSidebarOpen(false); }}
              >
                <div
                  style={{
                    position: 'absolute', left: -12, top: '50%',
                    transform: 'translateY(-50%)',
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--color-accent)',
                    opacity: isTotActive ? 1 : 0,
                    transition: 'opacity 0.15s ease',
                  }}
                />
                <span
                  className="flex-1 min-w-0 truncate text-[26px] leading-[1.05] uppercase transition-colors group-hover:text-[var(--color-accent-text)]"
                  style={{
                    fontFamily: 'var(--font-headline)',
                    color: isTotActive ? 'var(--color-accent-text)' : 'var(--color-black)',
                  }}
                >
                  Tot
                </span>
                {referencies.length > 0 && (
                  <span className="script-category-count">{referencies.length}</span>
                )}
              </div>
            </div>

            <div className="subheading mb-3">Sectors</div>
            {sectors.length === 0 ? (
              <div className="text-[var(--color-text-faint)] text-[11px] py-1">—</div>
            ) : (
              sectors.map(sector => (
                <SectorItem
                  key={sector.id}
                  sector={sector}
                  isExpanded={expandedSectorId === sector.id}
                  confirmingDeleteId={confirmingDeleteId}
                  onToggleExpand={handleToggleExpand}
                  onEdit={s => setModalTarget({ kind: 'edit-sector', sector: s })}
                  onNewRepositori={sectorId => setModalTarget({ kind: 'create-repositori', sectorId })}
                  onEditRepositori={repositori => setModalTarget({ kind: 'edit-repositori', repositori })}
                  onRequestDelete={id => setConfirmingDeleteId(id)}
                  onConfirmDelete={async id => {
                    const s = sectors.find(s => s.id === id);
                    await deleteSector(id);
                    setConfirmingDeleteId(null);
                    addToast({ type: 'success', message: `Esborrat «${s?.name ?? 'Sector'}»` });
                  }}
                  onCancelDelete={() => setConfirmingDeleteId(null)}
                />
              ))
            )}
          </div>

          {/* Icones — absolutes, sempre a 24px de baix */}
          <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', gap: 16, zIndex: 1 }}>
            {!readOnly && (
              <button
                onClick={() => setModalTarget({ kind: 'create-sector' })}
                className="sidebar-icon-btn sidebar-icon-plus"
                title="Nou sector"
              >
                <NewSceneIcon size={50} />
              </button>
            )}
            {showSettings && (
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="sidebar-icon-btn sidebar-icon-settings"
                title="Configuració"
              >
                <Config50Icon />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Modal — fora del calaix per evitar el clipping */}
      {modalTarget !== null && (
        <EntityModal
          target={modalTarget}
          onClose={() => setModalTarget(null)}
          onSave={handleModalSave}
        />
      )}
    </>
  );
}
