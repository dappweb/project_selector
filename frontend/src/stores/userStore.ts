import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, UserPreferences, Notification } from '@/types';

interface UserStore {
  // State
  user: User | null;
  preferences: UserPreferences;
  notifications: Notification[];
  
  // Actions
  setUser: (user: User | null) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Computed
  unreadNotifications: () => Notification[];
  unreadCount: () => number;
}

const defaultPreferences: UserPreferences = {
  theme: 'light',
  language: 'zh-CN',
  notifications: {
    email: true,
    browser: true,
    highValueProjects: true,
    deadlineReminders: true,
  },
  dashboard: {
    defaultView: 'grid',
    itemsPerPage: 20,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  },
};

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        preferences: defaultPreferences,
        notifications: [],

        // Actions
        setUser: (user) => set({ user }),
        
        updatePreferences: (prefs) => set((state) => ({
          preferences: { ...state.preferences, ...prefs }
        })),
        
        addNotification: (notification) => set((state) => ({
          notifications: [notification, ...state.notifications]
        })),
        
        markNotificationAsRead: (id) => set((state) => ({
          notifications: state.notifications.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
          )
        })),
        
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(notification => notification.id !== id)
        })),
        
        clearNotifications: () => set({ notifications: [] }),

        // Computed
        unreadNotifications: () => {
          const { notifications } = get();
          return notifications.filter(notification => !notification.read);
        },
        
        unreadCount: () => {
          const { notifications } = get();
          return notifications.filter(notification => !notification.read).length;
        },
      }),
      {
        name: 'user-store',
      }
    ),
    {
      name: 'user-store',
    }
  )
);