import { describe, it, expect } from 'vitest'
import { localIpv4 } from './net'

describe('localIpv4', () => {
  it('picks the private LAN IPv4, ignoring loopback and IPv6', () => {
    const ip = localIpv4({
      lo0: [{ family: 'IPv4', address: '127.0.0.1', internal: true } as never],
      en0: [
        { family: 'IPv6', address: 'fe80::1', internal: false } as never,
        { family: 'IPv4', address: '192.168.31.20', internal: false } as never
      ]
    })
    expect(ip).toBe('192.168.31.20')
  })

  it('returns null when there is no usable external IPv4', () => {
    expect(
      localIpv4({ lo0: [{ family: 'IPv4', address: '127.0.0.1', internal: true } as never] })
    ).toBeNull()
  })
})
