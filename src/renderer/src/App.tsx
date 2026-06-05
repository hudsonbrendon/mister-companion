import { useState } from 'react'
import { ConnectionBar } from './ConnectionBar'
import { StatusTab } from './tabs/StatusTab'
import { ControlTab } from './tabs/ControlTab'
import { ScriptsTab } from './tabs/ScriptsTab'
import { FilesTab } from './tabs/FilesTab'
import { RATab } from './tabs/RATab'

const TABS = [
  { id: 'status', label: 'Status', el: <StatusTab /> },
  { id: 'control', label: 'Control', el: <ControlTab /> },
  { id: 'scripts', label: 'Scripts', el: <ScriptsTab /> },
  { id: 'files', label: 'Files', el: <FilesTab /> },
  { id: 'ra', label: 'RetroAchievements', el: <RATab /> }
] as const

export function App(): JSX.Element {
  const [active, setActive] = useState<string>('status')
  return (
    <div className="app">
      <ConnectionBar localIp={window.location.hostname || '192.168.1.10'} />
      <div role="tablist" className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel">
        {TABS.find((t) => t.id === active)?.el}
      </div>
    </div>
  )
}
