import { Activity, Gamepad2, Terminal, FolderOpen, Trophy } from 'lucide-react'
import { cn } from '../lib/utils'
import { StatusDot } from './StatusDot'
import { ConnectionBar } from '../ConnectionBar'
import { useStatusContext } from '../hooks/status-context'

const logoUrl = new URL('../../../../assets/logo.png', import.meta.url).href

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const NAV: NavItem[] = [
  { id: 'status', label: 'Status', icon: Activity },
  { id: 'control', label: 'Control', icon: Gamepad2 },
  { id: 'scripts', label: 'Scripts', icon: Terminal },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'ra', label: 'RetroAchievements', icon: Trophy }
]

export function Sidebar({
  active,
  onSelect
}: {
  active: string
  onSelect: (id: string) => void
}): JSX.Element {
  const status = useStatusContext()
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-4 border-r border-border bg-card/40 p-4 backdrop-blur">
      <div className="flex items-center gap-3 px-1">
        <img src={logoUrl} alt="MiSTer Companion" className="size-10 rounded-md" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">MiSTer Companion</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <StatusDot online={status.online} />
            {status.online ? 'Connected' : 'Offline'}
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
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto">
        <ConnectionBar localIp={window.location.hostname || '192.168.1.10'} />
      </div>
    </aside>
  )
}
