import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  playerId: string | null
  displayName: string | null
}

interface AuthActions {
  setAuth: (token: string, playerId: string, displayName: string) => void
  setToken: (token: string) => void
  clearAuth: () => void
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Date.now() / 1000 >= payload.exp
  } catch {
    return true
  }
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      token: null,
      playerId: null,
      displayName: null,

      setAuth: (token, playerId, displayName) => set({ token, playerId, displayName }),

      setToken: (token) => set({ token }),

      clearAuth: () => set({ token: null, playerId: null, displayName: null }),
    }),
    {
      name: 'werewolf-auth',
      onRehydrateStorage: () => (state) => {
        // Clear expired tokens on hydration
        if (state?.token && isTokenExpired(state.token)) {
          state.clearAuth()
        }
      },
    }
  )
)
