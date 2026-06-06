import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster } from './components/ui/sonner'
import { Sidebar, NAV } from './components/Sidebar'
import { UpdateBanner } from './components/UpdateBanner'
import { CommandPalette } from './components/CommandPalette'
import { StatusTab } from './tabs/StatusTab'
import { GamesTab } from './tabs/GamesTab'
import { ControlTab } from './tabs/ControlTab'
import { ScriptsTab } from './tabs/ScriptsTab'
import { FilesTab } from './tabs/FilesTab'
import { MediaTab } from './tabs/MediaTab'
import { RATab } from './tabs/RATab'
import { StatusProvider } from './hooks/status-context'

const SCREENS: Record<string, () => JSX.Element> = {
  status: () => <StatusTab />,
  games: () => <GamesTab />,
  control: () => <ControlTab />,
  scripts: () => <ScriptsTab />,
  files: () => <FilesTab />,
  media: () => <MediaTab />,
  ra: () => <RATab />
}

export function App(): JSX.Element {
  const [active, setActive] = useState<string>('status')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { t } = useTranslation()
  const label = t(NAV.find((n) => n.id === active)?.i18nKey ?? '')

  // Global Cmd/Ctrl+K toggles the quick-launch palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <TooltipProvider delayDuration={200}>
      <StatusProvider>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar active={active} onSelect={setActive} />
          <main role="tabpanel" aria-label={label} className="flex flex-1 flex-col overflow-hidden">
            <UpdateBanner />
            <div className="flex-1 overflow-y-auto p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {SCREENS[active]()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </StatusProvider>
      <Toaster />
    </TooltipProvider>
  )
}
