import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getStoredTheme, resolveTheme, applyTheme, setTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('theme', () => {
  it('defaults to dark when nothing is stored', () => {
    expect(getStoredTheme()).toBe('dark')
  })

  it('reads a previously stored theme', () => {
    localStorage.setItem('theme', 'light')
    expect(getStoredTheme()).toBe('light')
  })

  it('applyTheme toggles the dark class on <html>', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setTheme persists to localStorage and applies it', () => {
    setTheme('light')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('resolveTheme maps system to light/dark via prefers-color-scheme', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    expect(resolveTheme('system')).toBe('dark')
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
    expect(resolveTheme('system')).toBe('light')
  })
})
