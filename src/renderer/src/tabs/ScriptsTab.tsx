import { useEffect, useState } from 'react'
import { api } from '../api'
import { ScriptDef } from '@shared/types'

export function ScriptsTab(): JSX.Element {
  const [scripts, setScripts] = useState<ScriptDef[]>([])
  const [output, setOutput] = useState('')

  useEffect(() => {
    api.listScripts().then(setScripts)
    const unsub = api.onScriptOutput((o) => setOutput((prev) => prev + o.chunk))
    return unsub
  }, [])

  return (
    <div className="scripts">
      <ul className="script-list">
        {scripts.map((s) => (
          <li key={s.id}>
            <button onClick={() => { setOutput(''); api.runScript(s.id) }}>{s.label}</button>
            <span className="desc">{s.description}</span>
          </li>
        ))}
      </ul>
      <pre className="script-output">{output}</pre>
    </div>
  )
}
