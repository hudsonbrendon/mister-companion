import { Bonjour } from 'bonjour-service'
import { DiscoveredDevice } from '@shared/types'
import { REST_PATHS } from './restClient'

// Probe a single host's status endpoint; return its hostname if it answers.
async function probeHost(
  host: string,
  port: number,
  timeoutMs: number,
  fetchFn: typeof fetch = fetch
): Promise<DiscoveredDevice | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchFn(`http://${host}:${port}${REST_PATHS.status}`, {
      signal: ctrl.signal
    })
    if (!res.ok) return null
    const body = (await res.json()) as { hostname?: string }
    return { host, hostname: body.hostname ?? null, source: 'scan' }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function scanHosts(
  hosts: string[],
  port = 8182,
  timeoutMs = 800,
  fetchFn: typeof fetch = fetch
): Promise<DiscoveredDevice[]> {
  const results = await Promise.all(hosts.map((h) => probeHost(h, port, timeoutMs, fetchFn)))
  return results.filter((r): r is DiscoveredDevice => r !== null)
}

// Build the /24 host list from a local IPv4 like "192.168.31.20" → .1..254.
export function subnetHosts(localIp: string): string[] {
  const parts = localIp.split('.')
  if (parts.length !== 4 || !parts.every((p) => /^\d+$/.test(p) && Number(p) <= 255)) return []
  const base = parts.slice(0, 3).join('.')
  const hosts: string[] = []
  for (let i = 1; i <= 254; i++) hosts.push(`${base}.${i}`)
  return hosts
}

export function mergeDevices(
  scan: DiscoveredDevice[],
  mdns: DiscoveredDevice[]
): DiscoveredDevice[] {
  const byHost = new Map<string, DiscoveredDevice>()
  for (const d of scan) byHost.set(d.host, d)
  for (const d of mdns) {
    const existing = byHost.get(d.host)
    if (!existing || (!existing.hostname && d.hostname)) byHost.set(d.host, d)
  }
  return [...byHost.values()]
}

// mDNS browse for mrext's advertised service. Resolves after `waitMs`.
export function browseMdns(serviceType = 'mister-remote', waitMs = 2000): Promise<DiscoveredDevice[]> {
  return new Promise((resolve) => {
    try {
      const bonjour = new Bonjour()
      const found: DiscoveredDevice[] = []
      const browser = bonjour.find({ type: serviceType }, (service) => {
        const host = service.referer?.address ?? service.addresses?.[0]
        if (host) found.push({ host, hostname: service.host ?? null, source: 'mdns' })
      })
      setTimeout(() => {
        browser.stop()
        bonjour.destroy()
        resolve(found)
      }, waitMs)
    } catch {
      resolve([])
    }
  })
}
