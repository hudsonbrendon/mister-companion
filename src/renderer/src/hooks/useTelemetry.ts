import { useEffect, useState } from 'react'
import { api } from '../api'
import { SshTelemetry } from '@shared/types'

// Polls SSH telemetry (uptime/load/RAM/kernel) while connected. Returns null when
// offline or when the device has no SSH session.
export function useTelemetry(online: boolean): SshTelemetry | null {
  const [tel, setTel] = useState<SshTelemetry | null>(null)
  useEffect(() => {
    if (!online) {
      setTel(null)
      return
    }
    let active = true
    const poll = (): void => {
      Promise.resolve(api.sshProbe?.())
        .then((t) => { if (active) setTel((t as SshTelemetry) ?? null) })
        .catch(() => { if (active) setTel(null) })
    }
    poll()
    const id = setInterval(poll, 15000)
    return () => { active = false; clearInterval(id) }
  }, [online])
  return tel
}
