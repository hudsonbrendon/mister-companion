# MiSTer Companion (Desktop) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform (macOS/Windows/Linux) Electron desktop app that discovers a MiSTer FPGA on the LAN, shows live status, controls it (launch game / reboot), runs system scripts over SSH, browses the SD card over SMB, and views RetroAchievements progress.

**Architecture:** Electron with a strict main/preload/renderer split (electron-vite). The **main process** owns all I/O (mrext REST, mrext WebSocket, SSH via `ssh2`, LAN discovery, SMB, RetroAchievements HTTP) as pure, dependency-injected TypeScript modules. The **preload** exposes a typed, channel-whitelisted bridge via `contextBridge`. The **renderer** is a React + Vite UI (tabbed) that only talks to the main process through `window.api`. The TS client layer mirrors the surface of the user's existing `python-mister-fpga` library so behavior stays consistent across both.

**Tech Stack:** Electron, TypeScript, React 18, electron-vite (Vite), electron-builder, Vitest + @testing-library/react (jsdom), `ws`, `ssh2`, `@marsaud/smb2`, `bonjour-service` (mDNS), `electron-store`.

---

## Conventions used in every task

- **Package manager:** `npm`. Every `npm run test` invocation runs Vitest once (`vitest run`), never watch mode.
- **TDD loop:** write the failing test → run it red → minimal implementation → run it green → commit.
- **Commits:** Conventional Commits. **No `Co-Authored-By` trailer** (user preference: commits solely Hudson Brendon). Before the first public push, the per-task commits will be squashed into one clean commit (final task).
- **Main-process modules are pure and injectable:** every network/IO dependency (HTTP fetch, `ws`, `ssh2.Client`, smb client, mDNS browser) is passed in via a factory parameter with a real default, so unit tests inject fakes/local servers and never touch a real device.
- **Status field names are canonical** and identical everywhere (`MisterStatus` in `src/shared/types.ts`). Disk fields are camelCase `diskTotal/diskUsed/diskFree` in TS (the Python lib uses `disk_total` etc.; the REST mapper translates).

### Protocol-fidelity checkpoints (read once before Phase 1)

Unit tests use **local mock servers**, so they verify the client is internally consistent, not that paths match a real MiSTer. Three modules carry a manual verification checkpoint against a real device and against `python-mister-fpga`:

- REST endpoint paths (Task 3)
- WebSocket message shapes / reducer (Tasks 4–5)
- SSH probe command + output parsing (Task 6)

Each of those tasks ends with a **`[ ] Manual verify`** step. If a real MiSTer is unavailable when implementing, leave the checkbox unchecked and open a tracking note in `CLAUDE.md` under "Pending device verification" — do not block the rest of the plan.

---

## File Structure

```
mister-companion/
├── package.json
├── tsconfig.json                 # base TS config (shared)
├── tsconfig.node.json            # main/preload
├── tsconfig.web.json             # renderer
├── electron.vite.config.ts       # electron-vite (main/preload/renderer)
├── vitest.config.ts              # test runner (node + jsdom projects)
├── electron-builder.yml          # packaging targets
├── CLAUDE.md                      # project context for Claude Code (committed)
├── README.md
├── LICENSE                        # MIT
├── .gitignore
├── .github/workflows/build.yml    # CI: lint, test, multi-OS package
├── src/
│   ├── shared/
│   │   └── types.ts               # MisterStatus, MisterProfile, IPC channel consts, payloads
│   ├── main/
│   │   ├── index.ts               # app lifecycle + BrowserWindow
│   │   ├── ipc.ts                 # registers IPC handlers, wires clients
│   │   ├── store.ts               # electron-store profile persistence
│   │   └── mister/
│   │       ├── restClient.ts      # mrext REST :8182 (status, launch, reboot)
│   │       ├── wsReducer.ts       # pure applyWsMessage()
│   │       ├── wsClient.ts        # mrext WebSocket listen + reconnect
│   │       ├── sshProbe.ts        # pure parseSshProbe()
│   │       ├── sshClient.ts       # ssh2 connect, exec, probe
│   │       ├── discovery.ts       # subnet scan + mDNS merge
│   │       ├── scripts.ts         # script catalog + run over SSH
│   │       ├── raWeb.ts           # RetroAchievements.org client
│   │       └── smb.ts             # SMB list/read via @marsaud/smb2
│   ├── preload/
│   │   └── index.ts               # contextBridge typed api
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx            # shell: connection bar + tab router
│           ├── api.ts             # typed wrapper over window.api
│           ├── hooks/
│           │   └── useStatus.ts   # subscribes to live status
│           └── tabs/
│               ├── StatusTab.tsx
│               ├── ControlTab.tsx
│               ├── ScriptsTab.tsx
│               ├── FilesTab.tsx
│               └── RATab.tsx
└── tests/
    └── helpers/
        ├── httpMock.ts            # ephemeral HTTP server helper
        └── wsMock.ts              # ephemeral WS server helper
```

---

# Phase 0 — Scaffold & Tooling

### Task 1: Initialize repository and toolchain

**Files:**
- Create: `mister-companion/package.json`
- Create: `mister-companion/tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `mister-companion/electron.vite.config.ts`
- Create: `mister-companion/vitest.config.ts`
- Create: `mister-companion/.gitignore`
- Create: `mister-companion/LICENSE`

- [ ] **Step 1: Create the project directory and init git**

```bash
mkdir -p ~/Github/mister-companion
cd ~/Github/mister-companion
git init -b main
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "mister-companion",
  "version": "0.0.0",
  "description": "Cross-platform desktop companion for MiSTer FPGA",
  "author": "Hudson Brendon",
  "license": "MIT",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "test": "vitest run",
    "lint": "eslint . --ext .ts,.tsx",
    "package": "electron-vite build && electron-builder",
    "package:dir": "electron-vite build && electron-builder --dir"
  },
  "dependencies": {
    "@marsaud/smb2": "^0.18.0",
    "bonjour-service": "^1.2.1",
    "electron-store": "^8.2.0",
    "ssh2": "^1.15.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^14.2.1",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/ssh2": "^1.15.0",
    "@types/ws": "^8.5.10",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitejs/plugin-react": "^4.2.1",
    "electron": "^29.1.0",
    "electron-builder": "^24.13.3",
    "electron-vite": "^2.1.0",
    "eslint": "^8.57.0",
    "jsdom": "^24.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.4.0",
    "vitest": "^1.3.0"
  }
}
```

- [ ] **Step 3: Write the three `tsconfig` files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "baseUrl": ".",
    "paths": { "@shared/*": ["src/shared/*"] }
  },
  "include": ["src", "tests"]
}
```

`tsconfig.node.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src/main", "src/preload", "src/shared", "tests"]
}
```

`tsconfig.web.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "jsx": "react-jsx", "lib": ["ES2022", "DOM", "DOM.Iterable"] },
  "include": ["src/renderer", "src/shared"]
}
```

- [ ] **Step 4: Write `electron.vite.config.ts`**

```ts
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: { alias: { '@shared': resolve('src/shared') } },
    build: { rollupOptions: { input: resolve('src/renderer/index.html') } }
  }
})
```

- [ ] **Step 5: Write `vitest.config.ts`** (two projects: node for main, jsdom for renderer)

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@shared': resolve('src/shared') } },
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['src/renderer/**', 'jsdom'],
      ['**', 'node']
    ],
    setupFiles: ['tests/setup.ts']
  }
})
```

- [ ] **Step 6: Write `tests/setup.ts`, `.gitignore`, `LICENSE`**

`tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

`.gitignore`:

```gitignore
node_modules/
out/
dist/
*.log
.DS_Store
```

`LICENSE` — standard MIT text, copyright line: `Copyright (c) 2026 Hudson Brendon`.

- [ ] **Step 7: Install and verify the toolchain runs**

Run:
```bash
cd ~/Github/mister-companion
npm install
npm run test
```
Expected: Vitest runs and reports **"No test files found"** (exit code may be non-zero for no-tests; that is acceptable here — the toolchain resolves and launches). If it errors on config resolution, fix before proceeding.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold electron-vite + typescript + vitest toolchain"
```

---

### Task 2: Shared types and CLAUDE.md

**Files:**
- Create: `src/shared/types.ts`
- Create: `CLAUDE.md`
- Test: `src/shared/types.test.ts`

- [ ] **Step 1: Write the failing test**

`src/shared/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { IPC, emptyStatus } from '@shared/types'

describe('shared types', () => {
  it('exposes stable IPC channel names', () => {
    expect(IPC.getStatus).toBe('mister:getStatus')
    expect(IPC.statusUpdate).toBe('mister:statusUpdate')
    expect(IPC.launchGame).toBe('mister:launchGame')
  })

  it('emptyStatus is offline with null fields and empty ips', () => {
    const s = emptyStatus()
    expect(s.online).toBe(false)
    expect(s.core).toBeNull()
    expect(s.ips).toEqual([])
    expect(s.diskTotal).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/shared/types.test.ts`
Expected: FAIL — `Cannot find module '@shared/types'`.

- [ ] **Step 3: Write `src/shared/types.ts`**

```ts
export interface MisterStatus {
  online: boolean
  core: string | null
  system: string | null
  game: string | null
  hostname: string | null
  version: string | null
  ip: string | null
  ips: string[]
  dns: string | null
  diskTotal: number | null
  diskUsed: number | null
  diskFree: number | null
}

export function emptyStatus(): MisterStatus {
  return {
    online: false, core: null, system: null, game: null, hostname: null,
    version: null, ip: null, ips: [], dns: null,
    diskTotal: null, diskUsed: null, diskFree: null
  }
}

export interface MisterProfile {
  id: string
  name: string
  host: string
  restPort: number
  sshPort: number
  sshUser?: string
  sshPassword?: string
}

export interface SshTelemetry {
  uptimeSeconds: number | null
  loadAvg: number | null
  memTotalKb: number | null
  memFreeKb: number | null
  temperatureC: number | null
  raw: Record<string, string>
}

export interface DiscoveredDevice {
  host: string
  hostname: string | null
  source: 'scan' | 'mdns'
}

export interface ScriptDef {
  id: string
  label: string
  description: string
  command: string
}

export interface RaSummary {
  hardcorePoints: number
  softcorePoints: number
  rank: number
  totalRanked: number
  currentGame: RaGameProgress | null
  recentGames: RaGameProgress[]
}

export interface RaGameProgress {
  gameId: number
  title: string
  console: string
  numAchieved: number
  numPossible: number
  percent: number
  iconUrl: string | null
}

export interface SmbEntry {
  name: string
  isDirectory: boolean
  size: number
}

export const IPC = {
  // request/response (invoke/handle)
  listProfiles: 'profiles:list',
  saveProfile: 'profiles:save',
  deleteProfile: 'profiles:delete',
  connect: 'mister:connect',
  disconnect: 'mister:disconnect',
  getStatus: 'mister:getStatus',
  launchGame: 'mister:launchGame',
  reboot: 'mister:reboot',
  discover: 'mister:discover',
  sshProbe: 'mister:sshProbe',
  listScripts: 'mister:listScripts',
  runScript: 'mister:runScript',
  raSummary: 'mister:raSummary',
  smbList: 'mister:smbList',
  // main → renderer events (send/on)
  statusUpdate: 'mister:statusUpdate',
  scriptOutput: 'mister:scriptOutput'
} as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/shared/types.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `CLAUDE.md`** (committed per user's "histórico do Claude" requirement)

```markdown
# MiSTer Companion — Claude Code Context

Cross-platform Electron desktop companion for MiSTer FPGA. Mirrors the surface of
the `python-mister-fpga` library (REST :8182, WebSocket, SSH probe, RetroAchievements)
but reimplemented in TypeScript for the Electron runtime.

## Architecture
- **main/** owns ALL I/O. Modules are pure + dependency-injected (network deps passed
  in via factory params) so unit tests inject fakes and never touch a real device.
- **preload/** exposes a channel-whitelisted `window.api` via contextBridge.
- **renderer/** is React + Vite; talks to main only through `window.api`.
- `src/shared/types.ts` is the single source of truth for `MisterStatus`, IPC channel
  names, and payload shapes. Disk fields are camelCase in TS.

## Communication channels
- mrext REST API on port 8182 (status, launch, reboot)
- mrext WebSocket (live core/game updates)
- SSH via `ssh2` (telemetry + script execution)
- LAN discovery: subnet port-scan of 8182 + mDNS (bonjour-service)
- SMB via `@marsaud/smb2` (browse the SD card / `/media/fat`)

## Commands
- `npm run dev` — run app in dev
- `npm run test` — Vitest (run mode, never watch)
- `npm run package` — electron-builder for the current OS

## Conventions
- TDD: failing test first. Conventional Commits. No Co-Authored-By trailer.
- Squash per-task commits into one clean commit before the first public push.

## Pending device verification
(Protocol-fidelity items confirmed against a real MiSTer go here — see plan Tasks 3–6.)
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shared types, IPC channel registry, and project CLAUDE.md"
```

---

# Phase 1 — Core mrext clients (main process, pure TS, TDD)

### Task 3: REST client (status, launch, reboot)

**Files:**
- Create: `tests/helpers/httpMock.ts`
- Create: `src/main/mister/restClient.ts`
- Test: `src/main/mister/restClient.test.ts`

- [ ] **Step 1: Write the HTTP mock helper**

`tests/helpers/httpMock.ts`:

```ts
import http from 'node:http'

export interface MockRoute {
  method: string
  path: string
  status?: number
  body?: unknown
}

export async function startHttpMock(routes: MockRoute[]) {
  const calls: { method: string; url: string; body: string }[] = []
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      calls.push({ method: req.method ?? '', url: req.url ?? '', body })
      const route = routes.find((r) => r.method === req.method && r.path === req.url)
      if (!route) { res.statusCode = 404; res.end('not found'); return }
      res.statusCode = route.status ?? 200
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(route.body ?? {}))
    })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as import('node:net').AddressInfo).port
  return {
    port,
    calls,
    close: () => new Promise<void>((r) => server.close(() => r()))
  }
}
```

- [ ] **Step 2: Write the failing test**

`src/main/mister/restClient.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { startHttpMock } from '../../../tests/helpers/httpMock'
import { RestClient } from './restClient'

let close: (() => Promise<void>) | null = null
afterEach(async () => { if (close) await close(); close = null })

describe('RestClient', () => {
  it('maps mrext status payload into MisterStatus camelCase', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/api/status', body: {
        core: 'SNES', system: 'SNES', game: 'Chrono Trigger',
        hostname: 'MiSTer', version: 'mrext-1.0', ip: '192.168.31.50',
        ips: ['192.168.31.50'], dns: '192.168.31.1',
        disk_total: 32_000_000_000, disk_used: 24_000_000_000, disk_free: 8_000_000_000
      } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    const status = await client.getStatus()
    expect(status.online).toBe(true)
    expect(status.core).toBe('SNES')
    expect(status.game).toBe('Chrono Trigger')
    expect(status.diskTotal).toBe(32_000_000_000)
    expect(status.diskFree).toBe(8_000_000_000)
  })

  it('returns offline status when the host is unreachable', async () => {
    const client = new RestClient('127.0.0.1', 1) // nothing listening
    const status = await client.getStatus()
    expect(status.online).toBe(false)
    expect(status.core).toBeNull()
  })

  it('POSTs the launch path', async () => {
    const mock = await startHttpMock([
      { method: 'POST', path: '/api/games/launch', body: { ok: true } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    await client.launchGame('/media/fat/games/SNES/Chrono Trigger.sfc')
    expect(mock.calls[0].method).toBe('POST')
    expect(JSON.parse(mock.calls[0].body)).toEqual({
      path: '/media/fat/games/SNES/Chrono Trigger.sfc'
    })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/main/mister/restClient.test.ts`
Expected: FAIL — `Cannot find module './restClient'`.

- [ ] **Step 4: Write `src/main/mister/restClient.ts`**

```ts
import { MisterStatus, emptyStatus } from '@shared/types'

// mrext Remote REST API paths. VERIFY against python-mister-fpga + a real device
// (see plan "Protocol-fidelity checkpoints"). Centralized so a path change is one edit.
export const REST_PATHS = {
  status: '/api/status',
  launch: '/api/games/launch',
  reboot: '/api/system/reboot'
} as const

interface RawStatus {
  core?: string; system?: string; game?: string; hostname?: string; version?: string
  ip?: string; ips?: string[]; dns?: string
  disk_total?: number; disk_used?: number; disk_free?: number
}

export class RestClient {
  constructor(
    private host: string,
    private port = 8182,
    private timeoutMs = 5000,
    private fetchFn: typeof fetch = fetch
  ) {}

  private url(path: string): string {
    return `http://${this.host}:${this.port}${path}`
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs)
    try {
      return await this.fetchFn(this.url(path), { ...init, signal: ctrl.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  async getStatus(): Promise<MisterStatus> {
    try {
      const res = await this.request(REST_PATHS.status)
      if (!res.ok) return emptyStatus()
      const raw = (await res.json()) as RawStatus
      return {
        online: true,
        core: raw.core ?? null,
        system: raw.system ?? null,
        game: raw.game ?? null,
        hostname: raw.hostname ?? null,
        version: raw.version ?? null,
        ip: raw.ip ?? null,
        ips: raw.ips ?? [],
        dns: raw.dns ?? null,
        diskTotal: raw.disk_total ?? null,
        diskUsed: raw.disk_used ?? null,
        diskFree: raw.disk_free ?? null
      }
    } catch {
      return emptyStatus()
    }
  }

  async launchGame(path: string): Promise<void> {
    await this.request(REST_PATHS.launch, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path })
    })
  }

  async reboot(): Promise<void> {
    await this.request(REST_PATHS.reboot, { method: 'POST' })
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/main/mister/restClient.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Manual verify (protocol fidelity)**

With a real MiSTer running mrext Remote on the LAN, clone the reference lib and confirm the three paths in `REST_PATHS` and the status field names match:
```bash
git clone https://github.com/hudsonbrendon/python-mister-fpga /tmp/pmf
grep -rniE "api/|status|launch|reboot|disk_" /tmp/pmf/src || true
curl -s http://<mister-ip>:8182/api/status | head
```
Adjust `REST_PATHS` / the `RawStatus` mapping if they differ, then re-run the test. If no device is available, leave this box unchecked and note it under "Pending device verification" in `CLAUDE.md`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: mrext REST client with status mapping, launch, reboot"
```

---

### Task 4: WebSocket reducer (pure)

**Files:**
- Create: `src/main/mister/wsReducer.ts`
- Test: `src/main/mister/wsReducer.test.ts`

- [ ] **Step 1: Write the failing test**

`src/main/mister/wsReducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { emptyStatus } from '@shared/types'
import { applyWsMessage } from './wsReducer'

describe('applyWsMessage', () => {
  it('updates core/system/game from a JSON status message', () => {
    const next = applyWsMessage(
      JSON.stringify({ type: 'status', core: 'Genesis', system: 'Genesis', game: 'Sonic' }),
      { ...emptyStatus(), online: true }
    )
    expect(next.core).toBe('Genesis')
    expect(next.game).toBe('Sonic')
    expect(next.online).toBe(true)
  })

  it('clears game when a menu/core-stop message arrives', () => {
    const start = { ...emptyStatus(), online: true, core: 'SNES', game: 'Zelda' }
    const next = applyWsMessage(JSON.stringify({ type: 'menu' }), start)
    expect(next.game).toBeNull()
    expect(next.core).toBe('menu')
  })

  it('ignores unparseable/unknown messages without throwing', () => {
    const start = { ...emptyStatus(), online: true, core: 'SNES' }
    expect(applyWsMessage('not-json', start)).toEqual(start)
    expect(applyWsMessage(JSON.stringify({ type: 'pong' }), start)).toEqual(start)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/main/mister/wsReducer.test.ts`
Expected: FAIL — `Cannot find module './wsReducer'`.

- [ ] **Step 3: Write `src/main/mister/wsReducer.ts`**

```ts
import { MisterStatus } from '@shared/types'

// Pure reducer: given a raw WS message string and the current status, return the next
// status. Mirrors python-mister-fpga's apply_ws_message intent (core/game transitions).
// VERIFY message shapes against a real device (see plan checkpoint).
export function applyWsMessage(message: string, status: MisterStatus): MisterStatus {
  let parsed: { type?: string; core?: string; system?: string; game?: string }
  try {
    parsed = JSON.parse(message)
  } catch {
    return status
  }
  switch (parsed.type) {
    case 'status':
      return {
        ...status,
        core: parsed.core ?? status.core,
        system: parsed.system ?? status.system,
        game: parsed.game ?? status.game
      }
    case 'menu':
      return { ...status, core: 'menu', game: null }
    default:
      return status
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/main/mister/wsReducer.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure WebSocket message reducer for live status transitions"
```

---

### Task 5: WebSocket client (listen + reconnect)

**Files:**
- Create: `tests/helpers/wsMock.ts`
- Create: `src/main/mister/wsClient.ts`
- Test: `src/main/mister/wsClient.test.ts`

- [ ] **Step 1: Write the WS mock helper**

`tests/helpers/wsMock.ts`:

```ts
import { WebSocketServer } from 'ws'

export async function startWsMock() {
  const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 })
  await new Promise<void>((r) => wss.on('listening', r))
  const port = (wss.address() as import('node:net').AddressInfo).port
  return {
    port,
    broadcast: (msg: string) => wss.clients.forEach((c) => c.send(msg)),
    close: () => new Promise<void>((r) => wss.close(() => r()))
  }
}
```

- [ ] **Step 2: Write the failing test**

`src/main/mister/wsClient.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { startWsMock } from '../../../tests/helpers/wsMock'
import { WsClient } from './wsClient'

let close: (() => Promise<void>) | null = null
afterEach(async () => { if (close) await close(); close = null })

describe('WsClient', () => {
  it('invokes the callback for each received message', async () => {
    const mock = await startWsMock()
    close = mock.close
    const received: string[] = []
    const client = new WsClient('127.0.0.1', mock.port, { path: '' })
    client.listen((m) => received.push(m))
    await new Promise((r) => setTimeout(r, 100)) // allow connect
    mock.broadcast('hello')
    await new Promise((r) => setTimeout(r, 100))
    client.stop()
    expect(received).toContain('hello')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/main/mister/wsClient.test.ts`
Expected: FAIL — `Cannot find module './wsClient'`.

- [ ] **Step 4: Write `src/main/mister/wsClient.ts`**

```ts
import WebSocket from 'ws'

export const WS_PATH = '/api/ws' // VERIFY against real device (plan checkpoint)

interface WsClientOpts {
  reconnectDelayMs?: number
  path?: string
}

export class WsClient {
  private ws: WebSocket | null = null
  private stopped = false
  private reconnectDelayMs: number
  private path: string

  constructor(private host: string, private port = 8182, opts: WsClientOpts = {}) {
    this.reconnectDelayMs = opts.reconnectDelayMs ?? 5000
    this.path = opts.path ?? WS_PATH
  }

  listen(onMessage: (raw: string) => void): void {
    this.stopped = false
    const connect = () => {
      if (this.stopped) return
      this.ws = new WebSocket(`ws://${this.host}:${this.port}${this.path}`)
      this.ws.on('message', (data) => onMessage(data.toString()))
      this.ws.on('close', () => {
        if (!this.stopped) setTimeout(connect, this.reconnectDelayMs)
      })
      this.ws.on('error', () => this.ws?.close())
    }
    connect()
  }

  stop(): void {
    this.stopped = true
    this.ws?.close()
    this.ws = null
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/main/mister/wsClient.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: reconnecting mrext WebSocket client"
```

---

### Task 6: SSH probe parser + SSH client

**Files:**
- Create: `src/main/mister/sshProbe.ts`
- Create: `src/main/mister/sshClient.ts`
- Test: `src/main/mister/sshProbe.test.ts`
- Test: `src/main/mister/sshClient.test.ts`

- [ ] **Step 1: Write the failing parser test**

`src/main/mister/sshProbe.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseSshProbe, PROBE_COMMAND } from './sshProbe'

describe('parseSshProbe', () => {
  it('parses the batched key=value probe output', () => {
    const raw = [
      'uptime=12345.67 0.00',
      'loadavg=0.42 0.31 0.20 1/123 4567',
      'memtotal=1019234',
      'memfree=812340',
      'temp=48123'
    ].join('\n')
    const t = parseSshProbe(raw)
    expect(t.uptimeSeconds).toBe(12345)
    expect(t.loadAvg).toBeCloseTo(0.42)
    expect(t.memTotalKb).toBe(1019234)
    expect(t.memFreeKb).toBe(812340)
    expect(t.temperatureC).toBeCloseTo(48.123)
  })

  it('PROBE_COMMAND is a single batched command line', () => {
    expect(PROBE_COMMAND).toContain('uptime')
    expect(PROBE_COMMAND).not.toContain('\n')
  })

  it('tolerates missing fields', () => {
    const t = parseSshProbe('memfree=100')
    expect(t.memFreeKb).toBe(100)
    expect(t.uptimeSeconds).toBeNull()
    expect(t.temperatureC).toBeNull()
  })
})
```

- [ ] **Step 2: Run parser test to verify it fails**

Run: `npm run test -- src/main/mister/sshProbe.test.ts`
Expected: FAIL — `Cannot find module './sshProbe'`.

- [ ] **Step 3: Write `src/main/mister/sshProbe.ts`**

```ts
import { SshTelemetry } from '@shared/types'

// One batched command so a single SSH exec returns everything. VERIFY paths exist on
// the MiSTer Linux image (plan checkpoint).
export const PROBE_COMMAND =
  'echo uptime=$(cat /proc/uptime); ' +
  'echo loadavg=$(cat /proc/loadavg); ' +
  'echo memtotal=$(awk "/MemTotal/{print \\$2}" /proc/meminfo); ' +
  'echo memfree=$(awk "/MemAvailable/{print \\$2}" /proc/meminfo); ' +
  'echo temp=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)'

function num(v: string | undefined): number | null {
  if (v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseSshProbe(raw: string): SshTelemetry {
  const map: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const eq = line.indexOf('=')
    if (eq === -1) continue
    map[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  const uptime = num(map.uptime?.split(/\s+/)[0])
  const load = num(map.loadavg?.split(/\s+/)[0])
  const tempRaw = num(map.temp)
  return {
    uptimeSeconds: uptime === null ? null : Math.floor(uptime),
    loadAvg: load,
    memTotalKb: num(map.memtotal),
    memFreeKb: num(map.memfree),
    temperatureC: tempRaw === null ? null : tempRaw / 1000,
    raw: map
  }
}
```

- [ ] **Step 4: Run parser test to verify it passes**

Run: `npm run test -- src/main/mister/sshProbe.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing SSH client test (inject a fake ssh2 Client)**

`src/main/mister/sshClient.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { EventEmitter } from 'node:events'
import { SshClient } from './sshClient'

// Minimal fake of ssh2.Client: connect() emits 'ready', exec() streams canned stdout.
function fakeClientFactory(stdout: string) {
  return () => {
    const client = new EventEmitter() as any
    client.connect = () => setTimeout(() => client.emit('ready'), 0)
    client.exec = (_cmd: string, cb: (err: unknown, stream: any) => void) => {
      const stream = new EventEmitter() as any
      stream.stderr = new EventEmitter()
      cb(null, stream)
      setTimeout(() => { stream.emit('data', Buffer.from(stdout)); stream.emit('close', 0) }, 0)
    }
    client.end = () => client.emit('close')
    return client
  }
}

describe('SshClient', () => {
  it('runs a command and resolves with stdout', async () => {
    const ssh = new SshClient(
      { host: '127.0.0.1', port: 22, username: 'root', password: '1' },
      fakeClientFactory('hello world')
    )
    const out = await ssh.exec('echo hi')
    expect(out.stdout).toBe('hello world')
    expect(out.code).toBe(0)
    await ssh.close()
  })

  it('probe() parses telemetry from the probe command output', async () => {
    const ssh = new SshClient(
      { host: '127.0.0.1', port: 22, username: 'root', password: '1' },
      fakeClientFactory('memfree=512\ntemp=40000')
    )
    const t = await ssh.probe()
    expect(t.memFreeKb).toBe(512)
    expect(t.temperatureC).toBeCloseTo(40)
    await ssh.close()
  })
})
```

- [ ] **Step 6: Run SSH client test to verify it fails**

Run: `npm run test -- src/main/mister/sshClient.test.ts`
Expected: FAIL — `Cannot find module './sshClient'`.

- [ ] **Step 7: Write `src/main/mister/sshClient.ts`**

```ts
import { Client } from 'ssh2'
import { SshTelemetry } from '@shared/types'
import { PROBE_COMMAND, parseSshProbe } from './sshProbe'

export interface SshCreds {
  host: string
  port: number
  username: string
  password?: string
}

export interface ExecResult {
  stdout: string
  stderr: string
  code: number | null
}

type ClientFactory = () => Client

export class SshClient {
  private client: Client | null = null
  constructor(
    private creds: SshCreds,
    private factory: ClientFactory = () => new Client()
  ) {}

  private connect(): Promise<Client> {
    if (this.client) return Promise.resolve(this.client)
    return new Promise((resolve, reject) => {
      const c = this.factory()
      c.on('ready', () => { this.client = c; resolve(c) })
      c.on('error', reject)
      c.connect({
        host: this.creds.host,
        port: this.creds.port,
        username: this.creds.username,
        password: this.creds.password
      })
    })
  }

  async exec(command: string, onData?: (chunk: string) => void): Promise<ExecResult> {
    const c = await this.connect()
    return new Promise((resolve, reject) => {
      c.exec(command, (err, stream) => {
        if (err) return reject(err)
        let stdout = ''
        let stderr = ''
        stream.on('data', (d: Buffer) => {
          const s = d.toString()
          stdout += s
          onData?.(s)
        })
        stream.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
        stream.on('close', (code: number | null) => resolve({ stdout, stderr, code }))
      })
    })
  }

  async probe(): Promise<SshTelemetry> {
    const { stdout } = await this.exec(PROBE_COMMAND)
    return parseSshProbe(stdout)
  }

  async close(): Promise<void> {
    this.client?.end()
    this.client = null
  }
}
```

- [ ] **Step 8: Run SSH client test to verify it passes**

Run: `npm run test -- src/main/mister/sshClient.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Manual verify (protocol fidelity)**

On a real MiSTer over SSH (`root`, default password per your memory note), run `PROBE_COMMAND` and confirm every field resolves (especially `thermal_zone0`). Adjust `PROBE_COMMAND` if a path differs on the DE10-Nano image; re-run the parser test. If no device available, note under "Pending device verification" in `CLAUDE.md`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: SSH client (ssh2) with batched telemetry probe + parser"
```

---

### Task 7: LAN discovery (subnet scan + mDNS)

**Files:**
- Create: `src/main/mister/discovery.ts`
- Test: `src/main/mister/discovery.test.ts`

- [ ] **Step 1: Write the failing test**

`src/main/mister/discovery.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { startHttpMock } from '../../../tests/helpers/httpMock'
import { scanHosts, mergeDevices } from './discovery'

let close: (() => Promise<void>) | null = null
afterEach(async () => { if (close) await close(); close = null })

describe('discovery', () => {
  it('scanHosts returns only hosts that answer the status probe', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/api/status', body: { hostname: 'MiSTer' } }
    ])
    close = mock.close
    // One reachable host (mock), one dead host (port 1).
    const found = await scanHosts(
      [`127.0.0.1`],
      mock.port,
      300
    )
    expect(found).toHaveLength(1)
    expect(found[0].host).toBe('127.0.0.1')
    expect(found[0].hostname).toBe('MiSTer')
    expect(found[0].source).toBe('scan')
  })

  it('mergeDevices dedupes by host, preferring an mdns hostname', () => {
    const merged = mergeDevices(
      [{ host: '192.168.31.50', hostname: null, source: 'scan' }],
      [{ host: '192.168.31.50', hostname: 'MiSTer.local', source: 'mdns' }]
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].hostname).toBe('MiSTer.local')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/main/mister/discovery.test.ts`
Expected: FAIL — `Cannot find module './discovery'`.

- [ ] **Step 3: Write `src/main/mister/discovery.ts`**

```ts
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
  if (parts.length !== 4) return []
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
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/main/mister/discovery.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: LAN discovery via subnet status-probe scan + mDNS merge"
```

---

### Task 8: Script catalog + runner

**Files:**
- Create: `src/main/mister/scripts.ts`
- Test: `src/main/mister/scripts.test.ts`

- [ ] **Step 1: Write the failing test**

`src/main/mister/scripts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SCRIPT_CATALOG, runScript } from './scripts'

describe('scripts', () => {
  it('catalog contains known MiSTer scripts with unique ids', () => {
    const ids = SCRIPT_CATALOG.map((s) => s.id)
    expect(ids).toContain('update_all')
    expect(ids).toContain('migrate_sd')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('runScript streams output through the supplied SSH exec and returns the code', async () => {
    const chunks: string[] = []
    const fakeSsh = {
      exec: async (cmd: string, onData?: (c: string) => void) => {
        expect(cmd).toContain('update_all')
        onData?.('running...')
        return { stdout: 'running...', stderr: '', code: 0 }
      }
    }
    const result = await runScript(fakeSsh as any, 'update_all', (c) => chunks.push(c))
    expect(result.code).toBe(0)
    expect(chunks).toContain('running...')
  })

  it('runScript rejects an unknown script id', async () => {
    const fakeSsh = { exec: async () => ({ stdout: '', stderr: '', code: 0 }) }
    await expect(runScript(fakeSsh as any, 'nope', () => {})).rejects.toThrow(/unknown script/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/main/mister/scripts.test.ts`
Expected: FAIL — `Cannot find module './scripts'`.

- [ ] **Step 3: Write `src/main/mister/scripts.ts`**

```ts
import { ScriptDef } from '@shared/types'
import { SshClient } from './sshClient'

export const SCRIPT_CATALOG: ScriptDef[] = [
  { id: 'update_all', label: 'Update All', description: 'Run the update_all script', command: '/media/fat/Scripts/update_all.sh' },
  { id: 'migrate_sd', label: 'Migrate SD', description: 'Reorganize the SD layout', command: '/media/fat/Scripts/migrate_sd.sh' },
  { id: 'cifs_mount', label: 'CIFS Mount', description: 'Mount network shares', command: '/media/fat/Scripts/cifs_mount.sh' },
  { id: 'auto_time', label: 'Auto Time', description: 'Sync the clock', command: '/media/fat/Scripts/auto_time.sh' },
  { id: 'ftp_save_sync', label: 'FTP Save Sync', description: 'Sync saves over FTP', command: '/media/fat/Scripts/ftp_save_sync.sh' }
]

export function findScript(id: string): ScriptDef | undefined {
  return SCRIPT_CATALOG.find((s) => s.id === id)
}

export async function runScript(
  ssh: Pick<SshClient, 'exec'>,
  id: string,
  onData: (chunk: string) => void
) {
  const script = findScript(id)
  if (!script) throw new Error(`unknown script: ${id}`)
  return ssh.exec(script.command, onData)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/main/mister/scripts.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: MiSTer script catalog and SSH-streamed runner"
```

---

### Task 9: RetroAchievements web client

**Files:**
- Create: `src/main/mister/raWeb.ts`
- Test: `src/main/mister/raWeb.test.ts`

- [ ] **Step 1: Write the failing test**

`src/main/mister/raWeb.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { startHttpMock } from '../../../tests/helpers/httpMock'
import { RaWebClient } from './raWeb'

let close: (() => Promise<void>) | null = null
afterEach(async () => { if (close) await close(); close = null })

describe('RaWebClient', () => {
  it('maps the RA user summary payload', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/API/API_GetUserSummary.php?u=hudson&y=key&g=1&a=1', body: {
        TotalPoints: 1234, TotalSoftcorePoints: 200, Rank: 42, TotalRanked: 100000,
        RecentlyPlayed: [{ GameID: 1, Title: 'Sonic', ConsoleName: 'Genesis', ImageIcon: '/i.png' }],
        Awarded: { '1': { NumAchieved: 5, NumPossibleAchievements: 50 } }
      } }
    ])
    close = mock.close
    const client = new RaWebClient('hudson', 'key', `http://127.0.0.1:${mock.port}`)
    const summary = await client.getSummary()
    expect(summary.hardcorePoints).toBe(1234)
    expect(summary.rank).toBe(42)
    expect(summary.recentGames[0].title).toBe('Sonic')
    expect(summary.recentGames[0].numPossible).toBe(50)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/main/mister/raWeb.test.ts`
Expected: FAIL — `Cannot find module './raWeb'`.

- [ ] **Step 3: Write `src/main/mister/raWeb.ts`**

```ts
import { RaSummary, RaGameProgress } from '@shared/types'

interface RawRecent { GameID: number; Title: string; ConsoleName: string; ImageIcon?: string }
interface RawSummary {
  TotalPoints?: number
  TotalSoftcorePoints?: number
  Rank?: number
  TotalRanked?: number
  RecentlyPlayed?: RawRecent[]
  Awarded?: Record<string, { NumAchieved?: number; NumPossibleAchievements?: number }>
}

const RA_BASE = 'https://retroachievements.org'

export class RaWebClient {
  constructor(
    private username: string,
    private apiKey: string,
    private base: string = RA_BASE,
    private fetchFn: typeof fetch = fetch
  ) {}

  async getSummary(): Promise<RaSummary> {
    const url =
      `${this.base}/API/API_GetUserSummary.php` +
      `?u=${encodeURIComponent(this.username)}&y=${encodeURIComponent(this.apiKey)}&g=1&a=1`
    const res = await this.fetchFn(url)
    if (!res.ok) throw new Error(`RA API error: ${res.status}`)
    const raw = (await res.json()) as RawSummary
    const recent: RaGameProgress[] = (raw.RecentlyPlayed ?? []).map((g) => {
      const award = raw.Awarded?.[String(g.GameID)]
      const num = award?.NumAchieved ?? 0
      const possible = award?.NumPossibleAchievements ?? 0
      return {
        gameId: g.GameID,
        title: g.Title,
        console: g.ConsoleName,
        numAchieved: num,
        numPossible: possible,
        percent: possible > 0 ? Math.round((num / possible) * 100) : 0,
        iconUrl: g.ImageIcon ? `${this.base}${g.ImageIcon}` : null
      }
    })
    return {
      hardcorePoints: raw.TotalPoints ?? 0,
      softcorePoints: raw.TotalSoftcorePoints ?? 0,
      rank: raw.Rank ?? 0,
      totalRanked: raw.TotalRanked ?? 0,
      currentGame: recent[0] ?? null,
      recentGames: recent
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/main/mister/raWeb.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: RetroAchievements web client (user summary)"
```

---

### Task 10: SMB file browser

**Files:**
- Create: `src/main/mister/smb.ts`
- Test: `src/main/mister/smb.test.ts`

- [ ] **Step 1: Write the failing test (inject a fake smb2 client)**

`src/main/mister/smb.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SmbBrowser } from './smb'

// Fake @marsaud/smb2: readdir returns node-style Dirent-ish objects via callback.
function fakeSmb2() {
  return {
    readdir: (path: string, cb: (err: unknown, files: any[]) => void) => {
      expect(path).toBe('games\\SNES')
      cb(null, [
        { name: 'Chrono Trigger.sfc', isDirectory: () => false, size: 4194304 },
        { name: 'subfolder', isDirectory: () => true, size: 0 }
      ])
    },
    disconnect: () => {}
  }
}

describe('SmbBrowser', () => {
  it('lists a directory, normalizing slashes and sorting dirs first', async () => {
    const browser = new SmbBrowser(
      { host: '192.168.31.50', share: 'sdcard', username: 'root', password: '1' },
      () => fakeSmb2() as any
    )
    const entries = await browser.list('games/SNES')
    expect(entries[0]).toEqual({ name: 'subfolder', isDirectory: true, size: 0 })
    expect(entries[1].name).toBe('Chrono Trigger.sfc')
    expect(entries[1].isDirectory).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/main/mister/smb.test.ts`
Expected: FAIL — `Cannot find module './smb'`.

- [ ] **Step 3: Write `src/main/mister/smb.ts`**

```ts
import SMB2 from '@marsaud/smb2'
import { SmbEntry } from '@shared/types'

export interface SmbCreds {
  host: string
  share: string
  username: string
  password?: string
  domain?: string
}

interface Smb2Like {
  readdir(path: string, cb: (err: unknown, files: any[]) => void): void
  disconnect(): void
}

type Smb2Factory = (creds: SmbCreds) => Smb2Like

const defaultFactory: Smb2Factory = (creds) =>
  new SMB2({
    share: `\\\\${creds.host}\\${creds.share}`,
    domain: creds.domain ?? 'WORKGROUP',
    username: creds.username,
    password: creds.password ?? ''
  }) as unknown as Smb2Like

export class SmbBrowser {
  constructor(private creds: SmbCreds, private factory: Smb2Factory = defaultFactory) {}

  list(path: string): Promise<SmbEntry[]> {
    const smb = this.factory(this.creds)
    const smbPath = path.replace(/\//g, '\\').replace(/^\\+/, '')
    return new Promise((resolve, reject) => {
      smb.readdir(smbPath, (err, files) => {
        smb.disconnect()
        if (err) return reject(err)
        const entries: SmbEntry[] = files.map((f) => ({
          name: f.name,
          isDirectory: typeof f.isDirectory === 'function' ? f.isDirectory() : !!f.isDirectory,
          size: f.size ?? 0
        }))
        entries.sort((a, b) =>
          a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1
        )
        resolve(entries)
      })
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/main/mister/smb.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: SMB directory browser over @marsaud/smb2"
```

---

### Task 11: Profile persistence store

**Files:**
- Create: `src/main/store.ts`
- Test: `src/main/store.test.ts`

- [ ] **Step 1: Write the failing test (inject an in-memory backing store)**

`src/main/store.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ProfileStore } from './store'

function memoryBacking() {
  const data = new Map<string, unknown>()
  return {
    get: (k: string, d: unknown) => (data.has(k) ? data.get(k) : d),
    set: (k: string, v: unknown) => data.set(k, v)
  }
}

describe('ProfileStore', () => {
  it('saves, lists, and deletes profiles by id', () => {
    const store = new ProfileStore(memoryBacking())
    store.save({ id: 'a', name: 'Living Room', host: '192.168.31.50', restPort: 8182, sshPort: 22 })
    expect(store.list()).toHaveLength(1)
    store.save({ id: 'a', name: 'Renamed', host: '192.168.31.50', restPort: 8182, sshPort: 22 })
    expect(store.list()[0].name).toBe('Renamed') // upsert, not duplicate
    store.delete('a')
    expect(store.list()).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/main/store.test.ts`
Expected: FAIL — `Cannot find module './store'`.

- [ ] **Step 3: Write `src/main/store.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/main/store.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: profile persistence store (electron-store)"
```

---

# Phase 2 — IPC wiring + Electron shell

### Task 12: Main process, IPC handlers, and preload bridge

**Files:**
- Create: `src/main/ipc.ts`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Test: `src/main/ipc.test.ts`

- [ ] **Step 1: Write the failing test for the IPC handler registry**

We test the handler wiring in isolation by passing a fake `ipcMain` and a fake session that records registrations. The connection session holds the live clients.

`src/main/ipc.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { createHandlers } from './ipc'
import { IPC, emptyStatus } from '@shared/types'

describe('createHandlers', () => {
  it('registers a handler per request channel and getStatus calls the rest client', async () => {
    const handlers = new Map<string, (...a: any[]) => any>()
    const ipcMain = { handle: (ch: string, fn: any) => handlers.set(ch, fn) } as any

    const fakeRest = { getStatus: vi.fn().mockResolvedValue({ ...emptyStatus(), online: true }) }
    const session = {
      rest: fakeRest,
      ssh: null,
      profileStore: { list: () => [], save: () => {}, delete: () => {} }
    } as any

    createHandlers(ipcMain, session)
    expect(handlers.has(IPC.getStatus)).toBe(true)
    expect(handlers.has(IPC.listProfiles)).toBe(true)

    const status = await handlers.get(IPC.getStatus)!({})
    expect(status.online).toBe(true)
    expect(fakeRest.getStatus).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/main/ipc.test.ts`
Expected: FAIL — `Cannot find module './ipc'`.

- [ ] **Step 3: Write `src/main/ipc.ts`**

```ts
import type { IpcMain } from 'electron'
import { IPC, MisterProfile } from '@shared/types'
import { RestClient } from './mister/restClient'
import { SshClient } from './mister/sshClient'
import { ProfileStore } from './store'
import { scanHosts, subnetHosts, browseMdns, mergeDevices } from './mister/discovery'
import { SCRIPT_CATALOG, runScript } from './mister/scripts'
import { RaWebClient } from './mister/raWeb'
import { SmbBrowser } from './mister/smb'

export interface Session {
  profileStore: ProfileStore
  rest: RestClient | null
  ssh: SshClient | null
  current: MisterProfile | null
  emit?: (channel: string, payload: unknown) => void
}

export function createHandlers(ipcMain: Pick<IpcMain, 'handle'>, session: Session): void {
  const h = (channel: string, fn: (...args: any[]) => any) =>
    ipcMain.handle(channel, (_e: unknown, ...args: any[]) => fn(...args))

  h(IPC.listProfiles, () => session.profileStore.list())
  h(IPC.saveProfile, (p: MisterProfile) => { session.profileStore.save(p); return session.profileStore.list() })
  h(IPC.deleteProfile, (id: string) => { session.profileStore.delete(id); return session.profileStore.list() })

  h(IPC.connect, (p: MisterProfile) => {
    session.current = p
    session.rest = new RestClient(p.host, p.restPort)
    session.ssh = p.sshUser
      ? new SshClient({ host: p.host, port: p.sshPort, username: p.sshUser, password: p.sshPassword })
      : null
    return true
  })
  h(IPC.disconnect, async () => { await session.ssh?.close(); session.rest = null; session.ssh = null; session.current = null; return true })

  h(IPC.getStatus, () => session.rest?.getStatus() ?? Promise.resolve({ online: false }))
  h(IPC.launchGame, (path: string) => session.rest?.launchGame(path))
  h(IPC.reboot, () => session.rest?.reboot())

  h(IPC.discover, async (localIp: string) => {
    const port = session.current?.restPort ?? 8182
    const [scan, mdns] = await Promise.all([
      scanHosts(subnetHosts(localIp), port, 800),
      browseMdns().catch(() => [])
    ])
    return mergeDevices(scan, mdns)
  })

  h(IPC.sshProbe, () => session.ssh?.probe())
  h(IPC.listScripts, () => SCRIPT_CATALOG)
  h(IPC.runScript, (id: string) => {
    if (!session.ssh) throw new Error('not connected over SSH')
    return runScript(session.ssh, id, (chunk) => session.emit?.(IPC.scriptOutput, { id, chunk }))
  })

  h(IPC.raSummary, (username: string, apiKey: string) =>
    new RaWebClient(username, apiKey).getSummary())

  h(IPC.smbList, (share: string, path: string) => {
    const p = session.current
    if (!p) throw new Error('not connected')
    return new SmbBrowser({ host: p.host, share, username: p.sshUser ?? 'root', password: p.sshPassword }).list(path)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/main/ipc.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Write `src/main/index.ts`** (Electron lifecycle; not unit-tested — exercised at `npm run dev`)

```ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { createHandlers, Session } from './ipc'
import { ProfileStore } from './store'
import { RestClient } from './mister/restClient'
import { WsClient } from './mister/wsClient'
import { applyWsMessage } from './mister/wsReducer'
import { IPC, emptyStatus } from '@shared/types'

let win: BrowserWindow | null = null
let ws: WsClient | null = null

const session: Session = {
  profileStore: new ProfileStore(),
  rest: null,
  ssh: null,
  current: null,
  emit: (channel, payload) => win?.webContents.send(channel, payload)
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createHandlers(ipcMain, session)

  // When a profile connects, start a WS feed that pushes live status to the renderer.
  ipcMain.handle('mister:startStatusFeed', async () => {
    ws?.stop()
    if (!session.current) return false
    let status = { ...emptyStatus(), online: true }
    const rest = new RestClient(session.current.host, session.current.restPort)
    status = await rest.getStatus()
    session.emit?.(IPC.statusUpdate, status)
    ws = new WsClient(session.current.host, session.current.restPort)
    ws.listen((raw) => {
      status = applyWsMessage(raw, status)
      session.emit?.(IPC.statusUpdate, status)
    })
    return true
  })

  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  ws?.stop()
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 6: Write `src/preload/index.ts`** (channel-whitelisted bridge)

```ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/types'

const api = {
  listProfiles: () => ipcRenderer.invoke(IPC.listProfiles),
  saveProfile: (p: unknown) => ipcRenderer.invoke(IPC.saveProfile, p),
  deleteProfile: (id: string) => ipcRenderer.invoke(IPC.deleteProfile, id),
  connect: (p: unknown) => ipcRenderer.invoke(IPC.connect, p),
  disconnect: () => ipcRenderer.invoke(IPC.disconnect),
  getStatus: () => ipcRenderer.invoke(IPC.getStatus),
  launchGame: (path: string) => ipcRenderer.invoke(IPC.launchGame, path),
  reboot: () => ipcRenderer.invoke(IPC.reboot),
  discover: (localIp: string) => ipcRenderer.invoke(IPC.discover, localIp),
  sshProbe: () => ipcRenderer.invoke(IPC.sshProbe),
  listScripts: () => ipcRenderer.invoke(IPC.listScripts),
  runScript: (id: string) => ipcRenderer.invoke(IPC.runScript, id),
  raSummary: (u: string, k: string) => ipcRenderer.invoke(IPC.raSummary, u, k),
  smbList: (share: string, path: string) => ipcRenderer.invoke(IPC.smbList, share, path),
  startStatusFeed: () => ipcRenderer.invoke('mister:startStatusFeed'),
  onStatusUpdate: (cb: (s: unknown) => void) => {
    const listener = (_e: unknown, s: unknown) => cb(s)
    ipcRenderer.on(IPC.statusUpdate, listener)
    return () => ipcRenderer.removeListener(IPC.statusUpdate, listener)
  },
  onScriptOutput: (cb: (o: unknown) => void) => {
    const listener = (_e: unknown, o: unknown) => cb(o)
    ipcRenderer.on(IPC.scriptOutput, listener)
    return () => ipcRenderer.removeListener(IPC.scriptOutput, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
export type Api = typeof api
```

- [ ] **Step 7: Run the full suite to confirm nothing regressed**

Run: `npm run test`
Expected: PASS (all suites green).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: IPC handler registry, Electron main lifecycle, preload bridge"
```

---

# Phase 3 — Renderer UI (React)

### Task 13: Renderer entry, typed api wrapper, and App shell

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/api.ts`
- Create: `src/renderer/src/App.tsx`
- Test: `src/renderer/src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/App.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { App } from './App'

beforeEach(() => {
  ;(globalThis as any).window.api = {
    listProfiles: vi.fn().mockResolvedValue([]),
    onStatusUpdate: vi.fn().mockReturnValue(() => {}),
    onScriptOutput: vi.fn().mockReturnValue(() => {})
  }
})

describe('App', () => {
  it('renders the five tabs and switches the active tab on click', async () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /control/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /scripts/i }))
    expect(screen.getByRole('tab', { name: /scripts/i })).toHaveAttribute('aria-selected', 'true')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/src/App.test.tsx`
Expected: FAIL — `Cannot find module './App'`.

- [ ] **Step 3: Write `src/renderer/src/api.ts`** (typed accessor over the preload bridge)

```ts
import type { MisterStatus, MisterProfile, ScriptDef, RaSummary, SmbEntry, DiscoveredDevice, SshTelemetry } from '@shared/types'

export interface RendererApi {
  listProfiles(): Promise<MisterProfile[]>
  saveProfile(p: MisterProfile): Promise<MisterProfile[]>
  deleteProfile(id: string): Promise<MisterProfile[]>
  connect(p: MisterProfile): Promise<boolean>
  disconnect(): Promise<boolean>
  getStatus(): Promise<MisterStatus>
  launchGame(path: string): Promise<void>
  reboot(): Promise<void>
  discover(localIp: string): Promise<DiscoveredDevice[]>
  sshProbe(): Promise<SshTelemetry>
  listScripts(): Promise<ScriptDef[]>
  runScript(id: string): Promise<{ code: number | null }>
  raSummary(username: string, apiKey: string): Promise<RaSummary>
  smbList(share: string, path: string): Promise<SmbEntry[]>
  startStatusFeed(): Promise<boolean>
  onStatusUpdate(cb: (s: MisterStatus) => void): () => void
  onScriptOutput(cb: (o: { id: string; chunk: string }) => void): () => void
}

export const api: RendererApi = (globalThis as unknown as { window: { api: RendererApi } }).window.api
```

- [ ] **Step 4: Write `src/renderer/src/App.tsx`**

```tsx
import { useState } from 'react'
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
```

- [ ] **Step 5: Write the placeholder tab modules so App compiles**

Create each of these minimal stubs now; they are fully implemented in Tasks 14–18. They must exist with the exact exported names used in `App.tsx`.

`src/renderer/src/tabs/StatusTab.tsx`:
```tsx
export function StatusTab(): JSX.Element { return <div>Status</div> }
```
`src/renderer/src/tabs/ControlTab.tsx`:
```tsx
export function ControlTab(): JSX.Element { return <div>Control</div> }
```
`src/renderer/src/tabs/ScriptsTab.tsx`:
```tsx
export function ScriptsTab(): JSX.Element { return <div>Scripts</div> }
```
`src/renderer/src/tabs/FilesTab.tsx`:
```tsx
export function FilesTab(): JSX.Element { return <div>Files</div> }
```
`src/renderer/src/tabs/RATab.tsx`:
```tsx
export function RATab(): JSX.Element { return <div>RetroAchievements</div> }
```

- [ ] **Step 6: Write `src/renderer/index.html` and `src/renderer/src/main.tsx`**

`src/renderer/index.html`:
```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /><title>MiSTer Companion</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
`src/renderer/src/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test -- src/renderer/src/App.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: renderer entry, typed api wrapper, tabbed App shell"
```

---

### Task 14: Status tab (live status via feed)

**Files:**
- Create: `src/renderer/src/hooks/useStatus.ts`
- Modify: `src/renderer/src/tabs/StatusTab.tsx`
- Test: `src/renderer/src/tabs/StatusTab.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/tabs/StatusTab.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { StatusTab } from './StatusTab'
import { emptyStatus } from '@shared/types'

let pushStatus: (s: any) => void = () => {}

beforeEach(() => {
  ;(globalThis as any).window.api = {
    startStatusFeed: vi.fn().mockResolvedValue(true),
    onStatusUpdate: (cb: (s: any) => void) => { pushStatus = cb; return () => {} }
  }
})

describe('StatusTab', () => {
  it('shows Offline initially then renders live core/game when a status arrives', async () => {
    render(<StatusTab />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
    await act(async () => {
      pushStatus({ ...emptyStatus(), online: true, core: 'SNES', game: 'Chrono Trigger' })
    })
    expect(screen.getByText('SNES')).toBeInTheDocument()
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/src/tabs/StatusTab.test.tsx`
Expected: FAIL — current stub renders only `Status`.

- [ ] **Step 3: Write `src/renderer/src/hooks/useStatus.ts`**

```ts
import { useEffect, useState } from 'react'
import { api } from '../api'
import { MisterStatus, emptyStatus } from '@shared/types'

export function useStatus(): MisterStatus {
  const [status, setStatus] = useState<MisterStatus>(emptyStatus())
  useEffect(() => {
    const unsub = api.onStatusUpdate(setStatus)
    api.startStatusFeed()
    return unsub
  }, [])
  return status
}
```

- [ ] **Step 4: Write `src/renderer/src/tabs/StatusTab.tsx`**

```tsx
import { useStatus } from '../hooks/useStatus'

function gb(bytes: number | null): string {
  return bytes === null ? '—' : `${(bytes / 1e9).toFixed(1)} GB`
}

export function StatusTab(): JSX.Element {
  const s = useStatus()
  return (
    <div className="status">
      <div className="status-indicator">{s.online ? 'Online' : 'Offline'}</div>
      <dl>
        <dt>Core</dt><dd>{s.core ?? '—'}</dd>
        <dt>System</dt><dd>{s.system ?? '—'}</dd>
        <dt>Game</dt><dd>{s.game ?? '—'}</dd>
        <dt>Hostname</dt><dd>{s.hostname ?? '—'}</dd>
        <dt>Version</dt><dd>{s.version ?? '—'}</dd>
        <dt>IP</dt><dd>{s.ip ?? '—'}</dd>
        <dt>Disk</dt><dd>{gb(s.diskUsed)} / {gb(s.diskTotal)}</dd>
      </dl>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/renderer/src/tabs/StatusTab.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: live status tab with WS-driven useStatus hook"
```

---

### Task 15: Control tab (launch game + reboot)

**Files:**
- Modify: `src/renderer/src/tabs/ControlTab.tsx`
- Test: `src/renderer/src/tabs/ControlTab.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/tabs/ControlTab.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ControlTab } from './ControlTab'

const launchGame = vi.fn().mockResolvedValue(undefined)
const reboot = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  launchGame.mockClear(); reboot.mockClear()
  ;(globalThis as any).window.api = { launchGame, reboot }
})

describe('ControlTab', () => {
  it('launches the typed game path', () => {
    render(<ControlTab />)
    fireEvent.change(screen.getByPlaceholderText(/path to game/i), {
      target: { value: '/media/fat/games/SNES/Zelda.sfc' }
    })
    fireEvent.click(screen.getByRole('button', { name: /launch/i }))
    expect(launchGame).toHaveBeenCalledWith('/media/fat/games/SNES/Zelda.sfc')
  })

  it('calls reboot when the reboot button is clicked', () => {
    render(<ControlTab />)
    fireEvent.click(screen.getByRole('button', { name: /reboot/i }))
    expect(reboot).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/src/tabs/ControlTab.test.tsx`
Expected: FAIL — stub has no inputs/buttons.

- [ ] **Step 3: Write `src/renderer/src/tabs/ControlTab.tsx`**

```tsx
import { useState } from 'react'
import { api } from '../api'

export function ControlTab(): JSX.Element {
  const [path, setPath] = useState('')
  return (
    <div className="control">
      <div className="launch-row">
        <input
          placeholder="Path to game (e.g. /media/fat/games/SNES/Zelda.sfc)"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <button onClick={() => api.launchGame(path)} disabled={!path}>Launch</button>
      </div>
      <button className="danger" onClick={() => api.reboot()}>Reboot MiSTer</button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderer/src/tabs/ControlTab.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: control tab to launch games and reboot"
```

---

### Task 16: Scripts tab (catalog + live output)

**Files:**
- Modify: `src/renderer/src/tabs/ScriptsTab.tsx`
- Test: `src/renderer/src/tabs/ScriptsTab.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/tabs/ScriptsTab.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ScriptsTab } from './ScriptsTab'

const runScript = vi.fn().mockResolvedValue({ code: 0 })
let pushOutput: (o: any) => void = () => {}

beforeEach(() => {
  runScript.mockClear()
  ;(globalThis as any).window.api = {
    listScripts: vi.fn().mockResolvedValue([
      { id: 'update_all', label: 'Update All', description: 'd', command: 'c' }
    ]),
    runScript,
    onScriptOutput: (cb: (o: any) => void) => { pushOutput = cb; return () => {} }
  }
})

describe('ScriptsTab', () => {
  it('lists scripts, runs one, and appends streamed output', async () => {
    render(<ScriptsTab />)
    await waitFor(() => screen.getByRole('button', { name: /update all/i }))
    fireEvent.click(screen.getByRole('button', { name: /update all/i }))
    expect(runScript).toHaveBeenCalledWith('update_all')
    await act(async () => { pushOutput({ id: 'update_all', chunk: 'working...' }) })
    expect(screen.getByText(/working\.\.\./)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/src/tabs/ScriptsTab.test.tsx`
Expected: FAIL — stub renders only `Scripts`.

- [ ] **Step 3: Write `src/renderer/src/tabs/ScriptsTab.tsx`**

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderer/src/tabs/ScriptsTab.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scripts tab with catalog and live SSH output"
```

---

### Task 17: Files tab (SMB browser)

**Files:**
- Modify: `src/renderer/src/tabs/FilesTab.tsx`
- Test: `src/renderer/src/tabs/FilesTab.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/tabs/FilesTab.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FilesTab } from './FilesTab'

const smbList = vi.fn()

beforeEach(() => {
  smbList.mockReset()
  smbList.mockResolvedValueOnce([
    { name: 'games', isDirectory: true, size: 0 },
    { name: 'MiSTer.ini', isDirectory: false, size: 2048 }
  ])
  ;(globalThis as any).window.api = { smbList }
})

describe('FilesTab', () => {
  it('lists the root on mount and navigates into a directory on click', async () => {
    render(<FilesTab />)
    await waitFor(() => screen.getByText('games'))
    expect(smbList).toHaveBeenCalledWith('sdcard', '')
    smbList.mockResolvedValueOnce([{ name: 'SNES', isDirectory: true, size: 0 }])
    fireEvent.click(screen.getByText('games'))
    await waitFor(() => expect(smbList).toHaveBeenCalledWith('sdcard', 'games'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/src/tabs/FilesTab.test.tsx`
Expected: FAIL — stub renders only `Files`.

- [ ] **Step 3: Write `src/renderer/src/tabs/FilesTab.tsx`**

```tsx
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
            {e.isDirectory ? '📁' : '📄'} {e.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderer/src/tabs/FilesTab.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: files tab browsing the SD card over SMB"
```

---

### Task 18: RetroAchievements tab

**Files:**
- Modify: `src/renderer/src/tabs/RATab.tsx`
- Test: `src/renderer/src/tabs/RATab.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/tabs/RATab.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RATab } from './RATab'

const raSummary = vi.fn().mockResolvedValue({
  hardcorePoints: 1234, softcorePoints: 50, rank: 42, totalRanked: 100000,
  currentGame: null,
  recentGames: [
    { gameId: 1, title: 'Sonic', console: 'Genesis', numAchieved: 5, numPossible: 50, percent: 10, iconUrl: null }
  ]
})

beforeEach(() => {
  raSummary.mockClear()
  ;(globalThis as any).window.api = { raSummary }
})

describe('RATab', () => {
  it('fetches and renders the RA summary after entering credentials', async () => {
    render(<RATab />)
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'hudson' } })
    fireEvent.change(screen.getByPlaceholderText(/api key/i), { target: { value: 'key' } })
    fireEvent.click(screen.getByRole('button', { name: /load/i }))
    expect(raSummary).toHaveBeenCalledWith('hudson', 'key')
    await waitFor(() => screen.getByText(/1234/))
    expect(screen.getByText('Sonic')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/src/tabs/RATab.test.tsx`
Expected: FAIL — stub renders only `RetroAchievements`.

- [ ] **Step 3: Write `src/renderer/src/tabs/RATab.tsx`**

```tsx
import { useState } from 'react'
import { api } from '../api'
import { RaSummary } from '@shared/types'

export function RATab(): JSX.Element {
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [summary, setSummary] = useState<RaSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    api.raSummary(username, apiKey)
      .then((s) => { setSummary(s); setError(null) })
      .catch((e) => setError(String(e)))
  }

  return (
    <div className="ra">
      <div className="ra-creds">
        <input placeholder="RA Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        <button onClick={load} disabled={!username || !apiKey}>Load</button>
      </div>
      {error && <div className="error">{error}</div>}
      {summary && (
        <div className="ra-summary">
          <div className="ra-points">{summary.hardcorePoints} pts · Rank #{summary.rank}</div>
          <ul className="ra-games">
            {summary.recentGames.map((g) => (
              <li key={g.gameId}>
                {g.iconUrl && <img src={g.iconUrl} alt="" width={24} height={24} />}
                <span>{g.title}</span>
                <span className="progress">{g.numAchieved}/{g.numPossible} ({g.percent}%)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderer/src/tabs/RATab.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: PASS (all suites green).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: RetroAchievements tab with user summary and recent games"
```

---

# Phase 4 — Connection UI, packaging, CI, docs

### Task 19: Connection bar (discover, connect, profiles)

**Files:**
- Create: `src/renderer/src/ConnectionBar.tsx`
- Modify: `src/renderer/src/App.tsx`
- Test: `src/renderer/src/ConnectionBar.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/ConnectionBar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConnectionBar } from './ConnectionBar'

const connect = vi.fn().mockResolvedValue(true)
const discover = vi.fn().mockResolvedValue([
  { host: '192.168.31.50', hostname: 'MiSTer', source: 'scan' }
])

beforeEach(() => {
  connect.mockClear(); discover.mockClear()
  ;(globalThis as any).window.api = {
    listProfiles: vi.fn().mockResolvedValue([]),
    discover,
    connect,
    saveProfile: vi.fn().mockResolvedValue([])
  }
})

describe('ConnectionBar', () => {
  it('discovers devices and connects to a chosen one', async () => {
    render(<ConnectionBar localIp="192.168.31.20" />)
    fireEvent.click(screen.getByRole('button', { name: /discover/i }))
    await waitFor(() => screen.getByText(/192\.168\.31\.50/))
    fireEvent.click(screen.getByText(/192\.168\.31\.50/))
    await waitFor(() => expect(connect).toHaveBeenCalled())
    expect(connect.mock.calls[0][0].host).toBe('192.168.31.50')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/src/ConnectionBar.test.tsx`
Expected: FAIL — `Cannot find module './ConnectionBar'`.

- [ ] **Step 3: Write `src/renderer/src/ConnectionBar.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { api } from './api'
import { DiscoveredDevice, MisterProfile } from '@shared/types'

export function ConnectionBar({ localIp }: { localIp: string }): JSX.Element {
  const [found, setFound] = useState<DiscoveredDevice[]>([])
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState<string | null>(null)

  useEffect(() => { api.listProfiles() }, [])

  const discover = async () => {
    setBusy(true)
    try { setFound(await api.discover(localIp)) } finally { setBusy(false) }
  }

  const connect = async (d: DiscoveredDevice) => {
    const profile: MisterProfile = {
      id: d.host,
      name: d.hostname ?? d.host,
      host: d.host,
      restPort: 8182,
      sshPort: 22
    }
    await api.connect(profile)
    setConnected(d.host)
  }

  return (
    <div className="connection-bar">
      <button onClick={discover} disabled={busy}>{busy ? 'Scanning…' : 'Discover'}</button>
      {connected && <span className="connected">Connected: {connected}</span>}
      <ul className="device-list">
        {found.map((d) => (
          <li key={d.host}>
            <button onClick={() => connect(d)}>{d.hostname ?? d.host} — {d.host}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Add `ConnectionBar` to `App.tsx`**

In `src/renderer/src/App.tsx`, add the import at the top:
```tsx
import { ConnectionBar } from './ConnectionBar'
```
Then render it above the tablist by replacing the opening of the returned JSX:
```tsx
  return (
    <div className="app">
      <ConnectionBar localIp={window.location.hostname || '192.168.1.10'} />
      <div role="tablist" className="tabs">
```
(Leave the rest of `App.tsx` unchanged.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- src/renderer/src/ConnectionBar.test.tsx src/renderer/src/App.test.tsx`
Expected: PASS (both suites).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: connection bar with LAN discovery and connect"
```

---

### Task 20: electron-builder config + GitHub Actions multi-OS build

**Files:**
- Create: `electron-builder.yml`
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Write `electron-builder.yml`**

```yaml
appId: com.buildbrendon.mister-companion
productName: MiSTer Companion
directories:
  output: dist
  buildResources: build
files:
  - out/**/*
  - package.json
mac:
  target: [dmg]
  category: public.app-category.utilities
win:
  target: [nsis]
linux:
  target: [AppImage]
  category: Utility
```

- [ ] **Step 2: Write `.github/workflows/build.yml`**

```yaml
name: build
on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  package:
    needs: test
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run package
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/upload-artifact@v4
        with:
          name: mister-companion-${{ matrix.os }}
          path: |
            dist/*.dmg
            dist/*.exe
            dist/*.AppImage
          if-no-files-found: ignore
```

- [ ] **Step 3: Add an ESLint config so `npm run lint` succeeds in CI**

Create `.eslintrc.cjs`:
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, browser: true, es2022: true },
  ignorePatterns: ['out/', 'dist/', 'node_modules/'],
  rules: { '@typescript-eslint/no-explicit-any': 'off' }
}
```

- [ ] **Step 4: Verify lint and tests pass locally**

Run:
```bash
npm run lint
npm run test
```
Expected: lint reports no errors; all test suites PASS.

- [ ] **Step 5: Verify a local packaged build assembles (no publish)**

Run: `npm run package:dir`
Expected: `electron-vite build` completes and `electron-builder --dir` produces an unpacked app under `dist/`. (Full installer creation per-OS happens in CI.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ci: electron-builder targets and multi-OS GitHub Actions build"
```

---

### Task 21: README, minimal styling, and clean-history squash

**Files:**
- Create: `README.md`
- Create: `src/renderer/src/styles.css`
- Modify: `src/renderer/src/main.tsx`

- [ ] **Step 1: Write `README.md`**

Include: project description, screenshots placeholder, the communication channels (REST :8182, WebSocket, SSH, mDNS/subnet discovery, SMB), the dev/test/package commands, supported OS, MIT license note, and a "Built by Hudson Brendon" line. Match the tone/structure of the user's other repos (badges optional). Mention it complements `python-mister-fpga` and `ha-mister-fpga`.

```markdown
# MiSTer Companion

Cross-platform desktop companion for **MiSTer FPGA** (macOS / Windows / Linux).
Discover your MiSTer on the LAN, watch live status, launch games, reboot, run system
scripts over SSH, browse the SD card over SMB, and track RetroAchievements progress.

Built with Electron + TypeScript + React. Complements
[`python-mister-fpga`](https://github.com/hudsonbrendon/python-mister-fpga) and
[`ha-mister-fpga`](https://github.com/hudsonbrendon/ha-mister-fpga).

## Communication channels
- mrext Remote REST API (`:8182`) — status, launch, reboot
- mrext WebSocket — live core/game updates
- SSH (`ssh2`) — telemetry + script execution
- Discovery — subnet status-probe scan + mDNS
- SMB — browse `/media/fat` (the SD card)

## Develop
\`\`\`bash
npm install
npm run dev      # run the app
npm run test     # Vitest
npm run package  # build installer for the current OS
\`\`\`

## License
MIT © Hudson Brendon
```

- [ ] **Step 2: Add minimal styling and import it**

Create `src/renderer/src/styles.css` with a compact dark theme (tabs, panels, lists). Keep it small — this is polish, not a step that needs full design. Example skeleton:
```css
:root { color-scheme: dark; font-family: system-ui, sans-serif; }
body { margin: 0; background: #15131f; color: #e7e3f3; }
.tabs { display: flex; gap: 4px; padding: 8px; background: #1d1a2b; }
.tabs button[aria-selected='true'] { background: #6c4cff; color: #fff; }
.tabs button { background: #2a2540; color: #cfc9e6; border: 0; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.tab-panel { padding: 16px; }
.status-indicator { font-weight: 700; margin-bottom: 12px; }
.error { color: #ff6b81; }
.script-output { background: #0e0c16; padding: 8px; min-height: 120px; white-space: pre-wrap; }
```
Then import it in `src/renderer/src/main.tsx` by adding as the first line:
```tsx
import './styles.css'
```

- [ ] **Step 3: Run the full suite one last time**

Run: `npm run test`
Expected: PASS (all suites green).

- [ ] **Step 4: Commit the docs/styling**

```bash
git add -A
git commit -m "docs: README and minimal app styling"
```

- [ ] **Step 5: Squash all per-task commits into one clean commit (before any public push)**

Per user preference (clean git history before publishing a public repo):
```bash
cd ~/Github/mister-companion
git reset --soft $(git rev-list --max-parents=0 HEAD)   # back to first commit, keep all files staged
git commit --amend -m "feat: MiSTer Companion desktop app (Electron + TS + React)

Cross-platform companion for MiSTer FPGA: LAN discovery, live status (REST + WebSocket),
launch/reboot control, SSH telemetry + scripts, SMB SD-card browser, RetroAchievements viewer."
git log --oneline   # expect a single commit
```
Note: do **not** force-push over an existing public history without confirming with the user. This squash is intended for the pre-publish state (no remote yet).

- [ ] **Step 6: (Manual, when ready) create the public repo and push**

This is an outward-facing action — confirm with the user before running. Suggested:
```bash
gh repo create hudsonbrendon/mister-companion --public --source=. --remote=origin --description "Cross-platform desktop companion for MiSTer FPGA"
git push -u origin main
```

---

## Self-Review

**Spec coverage:**
- Cross-platform (Mac/Win/Linux) → Task 1 (electron-vite) + Task 20 (electron-builder dmg/nsis/AppImage, 3-OS CI). ✅
- ElectronJS rich UI → Phase 3 React tabs. ✅
- "Pegar todos os status e informações" → Task 3 (REST status), Task 5 (live WS), Task 6 (SSH telemetry), Task 14 (Status tab). ✅
- "Controlar via API ou qualquer canal" → Task 3 (launch/reboot via REST), Task 15 (Control tab); channels: REST, WS, SSH, discovery, SMB (Tasks 3,5,6,7,10). ✅
- v1 scope all four (status+realtime, control, ssh+scripts, RA) → Tasks 3–9, 14–18. ✅
- Discovery SSDP/UDP + mDNS → Task 7 (subnet scan + mDNS; subnet probe replaces raw SSDP, achieving the same "find on LAN" goal). ✅
- SMB → Task 10 + Task 17. ✅
- "Histórico do Claude" = CLAUDE.md → Task 2. ✅
- Pattern dos repos (MIT, python-mister-fpga consistency, naming) → Task 1 LICENSE, Task 21 README, CLAUDE.md. ✅

**Type consistency:** `MisterStatus` (camelCase disk fields) defined once in Task 2 and consumed identically in Tasks 3, 4, 5, 14. `IPC` channel constants defined in Task 2, used in preload (Task 12) and handlers (Task 12). `RendererApi` (Task 13) method names match preload `api` keys (Task 12) and IPC handler channels (Task 12): `getStatus`, `launchGame`, `reboot`, `discover`, `sshProbe`, `listScripts`, `runScript`, `raSummary`, `smbList`, `startStatusFeed`, `onStatusUpdate`, `onScriptOutput`. `RestClient` exports `REST_PATHS` consumed by `discovery.ts`. `runScript` signature `(ssh, id, onData)` consistent between Task 8 definition and Task 12 usage.

**Placeholder scan:** Tab stubs in Task 13 are intentional, named exports later fully implemented in Tasks 14–18 (noted explicitly), not hand-wavy TODOs. Protocol-fidelity items (REST paths, WS shapes, SSH probe) are concrete code with explicit manual-verification checkpoints — not deferred implementation.

**Known follow-ups (out of v1 scope, intentionally deferred):** MiSTer.ini editing, save backup/sync, SD-card offline mode, save synchronization, flashing — these were de-scoped in the requirements answers and can become a v2 plan.
