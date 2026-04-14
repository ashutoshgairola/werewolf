// frontend/src/hooks/useRoleTheme.ts
import { useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { ROLE_THEMES, type RoleTheme } from '@/theme/roleThemes'

export function useRoleTheme(): RoleTheme | null {
  const role = useGameStore((s) => s.role)
  const theme = role ? ROLE_THEMES[role] : null

  useEffect(() => {
    if (!theme) return
    const root = document.documentElement
    Object.entries(theme.cssVars).forEach(([prop, value]) => {
      root.style.setProperty(prop, value)
    })
    return () => {
      // Clean up CSS vars when component unmounts (e.g. game over → lobby)
      Object.keys(theme.cssVars).forEach(prop => {
        root.style.removeProperty(prop)
      })
    }
  }, [theme])

  return theme
}
