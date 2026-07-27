import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface UIState {
  // Sidebar (calaix de sectors i repositoris)
  sidebarOpen: boolean;
  sidebarClosing: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Modals
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

let toastIdCounter = 0;

export const useUIStore = create<UIState>()(
  immer((set, get) => ({
    // Sidebar
    sidebarOpen: false,
    sidebarClosing: false,
    toggleSidebar: () => {
      const { sidebarOpen, sidebarClosing } = get();
      if (sidebarClosing) return;
      if (sidebarOpen) {
        set(s => { s.sidebarClosing = true; });
        setTimeout(() => {
          set(s => { s.sidebarOpen = false; s.sidebarClosing = false; });
        }, 500);
      } else {
        set(s => { s.sidebarOpen = true; s.sidebarClosing = false; });
      }
    },
    setSidebarOpen: (open: boolean) => {
      const { sidebarOpen, sidebarClosing } = get();
      if (sidebarClosing) return;
      if (open === sidebarOpen) return;
      if (!open) {
        set(s => { s.sidebarClosing = true; });
        setTimeout(() => {
          set(s => { s.sidebarOpen = false; s.sidebarClosing = false; });
        }, 500);
      } else {
        set(s => { s.sidebarOpen = true; s.sidebarClosing = false; });
      }
    },

    // Modals
    settingsModalOpen: false,
    setSettingsModalOpen: (open: boolean) =>
      set(state => {
        state.settingsModalOpen = open;
      }),

    // Toast notifications
    toasts: [],
    addToast: (toast: Omit<Toast, 'id'>) =>
      set(state => {
        const id = `toast-${++toastIdCounter}`;
        state.toasts.push({ ...toast, id });

        // Auto-remove after duration
        const duration = toast.duration ?? 4000;
        setTimeout(() => {
          set(s => {
            s.toasts = s.toasts.filter(t => t.id !== id);
          });
        }, duration);
      }),
    removeToast: (id: string) =>
      set(state => {
        state.toasts = state.toasts.filter(t => t.id !== id);
      }),
  }))
);
