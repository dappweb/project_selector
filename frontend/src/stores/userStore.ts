import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'viewer'
  permissions: string[]
}

export interface Notification {
  id: string
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

interface UserState {
  user: User | null
  notifications: Notification[]
  isAuthenticated: boolean
  
  // Actions
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void
  markNotificationAsRead: (id: string) => void
  clearNotifications: () => void
  unreadCount: () => number
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      notifications: [],
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email: string, password: string) => {
        try {
          // 模拟登录API调用
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // 模拟用户数据
          const mockUser: User = {
            id: '1',
            name: '管理员',
            email,
            avatar: undefined,
            role: 'admin',
            permissions: ['read', 'write', 'admin']
          }
          
          set({ user: mockUser, isAuthenticated: true })
          return true
        } catch (error) {
          console.error('Login failed:', error)
          return false
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, notifications: [] })
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          read: false
        }
        
        set(state => ({
          notifications: [newNotification, ...state.notifications]
        }))
      },

      markNotificationAsRead: (id) => {
        set(state => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
          )
        }))
      },

      clearNotifications: () => {
        set({ notifications: [] })
      },

      unreadCount: () => {
        return get().notifications.filter(n => !n.read).length
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)