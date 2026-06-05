import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { SmbEntry } from '@shared/types'

const SHARE = 'sdcard'

export function FilesTab(): JSX.Element {
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<SmbEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((p: string) => {
    api.smbList(SHARE, p).then((e) => { setEntries(e); setError(null) }).catch((err) => setError(String(err)))
  }, [])

  useEffect(() => { load(path) }, [path, load])

  const open = (entry: SmbEntry) => {
    if (entry.isDirectory) setPath(path ? `${path}/${entry.name}` : entry.name)
  }

  const up = () => setPath(path.split('/').slice(0, -1).join('/'))

  return (
    <div className="files">
      <div className="path-bar">
        <button onClick={up} disabled={!path}>↑ Up</button>
        <span>/{path}</span>
      </div>
      {error && <div className="error">{error}</div>}
      <ul className="file-list">
        {entries.map((e) => (
          <li key={e.name} onClick={() => open(e)} className={e.isDirectory ? 'dir' : 'file'}>
            <span aria-hidden="true">{e.isDirectory ? '📁' : '📄'}</span> <span>{e.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
