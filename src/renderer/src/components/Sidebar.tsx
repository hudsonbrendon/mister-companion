import { Activity, Gamepad2, Terminal, FolderOpen, Trophy, Image } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { StatusDot } from './StatusDot'
import { ConnectionBar } from '../ConnectionBar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useStatusContext } from '../hooks/status-context'

export interface NavItem {
  id: string
  i18nKey: 'nav.status' | 'nav.control' | 'nav.scripts' | 'nav.files' | 'nav.media' | 'nav.ra'
  icon: React.ComponentType<{ className?: string }>
}

export const NAV: NavItem[] = [
  { id: 'status', i18nKey: 'nav.status', icon: Activity },
  { id: 'control', i18nKey: 'nav.control', icon: Gamepad2 },
  { id: 'scripts', i18nKey: 'nav.scripts', icon: Terminal },
  { id: 'files', i18nKey: 'nav.files', icon: FolderOpen },
  { id: 'media', i18nKey: 'nav.media', icon: Image },
  { id: 'ra', i18nKey: 'nav.ra', icon: Trophy }
]

export function Sidebar({
  active,
  onSelect
}: {
  active: string
  onSelect: (id: string) => void
}): JSX.Element {
  const status = useStatusContext()
  const { t } = useTranslation()
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-4 border-r border-border bg-card/40 p-4 backdrop-blur">
      <div className="flex items-center gap-3 px-1">
        <div className="leading-tight">
          <div className="text-sm font-semibold">MiSTer Companion</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <StatusDot online={status.online} />
            {status.online ? t('common.connected') : t('common.offline')}
          </div>
        </div>
      </div>

      <nav role="tablist" aria-orientation="vertical" className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon
          const selected = active === item.id
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
                selected
                  ? 'bg-primary/15 text-primary shadow-glow'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="size-4" />
              {t(item.i18nKey)}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <LanguageSwitcher />
        <ConnectionBar localIp={window.location.hostname || '192.168.1.10'} />
      </div>
    </aside>
  )
}
