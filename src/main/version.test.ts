import { describe, it, expect } from 'vitest'
import { isNewer } from './version'

describe('isNewer', () => {
  it('compares semver parts numerically', () => {
    expect(isNewer('0.2.14', '0.2.13')).toBe(true)
    expect(isNewer('0.3.0', '0.2.99')).toBe(true)
    expect(isNewer('1.0.0', '0.9.9')).toBe(true)
    expect(isNewer('0.2.13', '0.2.13')).toBe(false)
    expect(isNewer('0.2.12', '0.2.13')).toBe(false)
  })

  it('ignores a leading v and pre-release suffixes', () => {
    expect(isNewer('v0.2.14', '0.2.13')).toBe(true)
    expect(isNewer('0.2.14-beta', '0.2.14')).toBe(false)
  })
})
