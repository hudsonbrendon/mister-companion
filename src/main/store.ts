import Store from 'electron-store'
import { MisterProfile } from '@shared/types'

interface Backing {
  get(key: string, defaultValue: unknown): unknown
  set(key: string, value: unknown): void
}

const KEY = 'profiles'

export class ProfileStore {
  private backing: Backing
  constructor(backing?: Backing) {
    this.backing = backing ?? (new Store({ name: 'mister-companion' }) as unknown as Backing)
  }

  list(): MisterProfile[] {
    return (this.backing.get(KEY, []) as MisterProfile[]) ?? []
  }

  save(profile: MisterProfile): void {
    const profiles = this.list().filter((p) => p.id !== profile.id)
    profiles.push(profile)
    this.backing.set(KEY, profiles)
  }

  delete(id: string): void {
    this.backing.set(KEY, this.list().filter((p) => p.id !== id))
  }
}
