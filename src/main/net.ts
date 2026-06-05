import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os'

// Best local IPv4 for subnet scanning. Picks the first non-internal IPv4, preferring
// private LAN ranges (192.168/x, 10/x, 172.16–31/x). Returns null if none is usable.
// The interfaces map is injectable for testing.
export function localIpv4(
  ifaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces()
): string | null {
  const addrs: string[] = []
  for (const list of Object.values(ifaces)) {
    for (const i of list ?? []) {
      if (i.family === 'IPv4' && !i.internal) addrs.push(i.address)
    }
  }
  const priv = addrs.find((a) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a))
  return priv ?? addrs[0] ?? null
}
