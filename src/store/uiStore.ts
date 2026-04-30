import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  notificationsPanelOpen: boolean;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleNotificationsPanel: () => void;
  setNotificationsPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  notificationsPanelOpen: false,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleNotificationsPanel: () => set((state) => ({ 
    notificationsPanelOpen: !state.notificationsPanelOpen 
  })),
  setNotificationsPanelOpen: (open) => set({ notificationsPanelOpen: open }),
}));