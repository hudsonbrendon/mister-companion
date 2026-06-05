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
- SSH/SFTP via `ssh2` (browse the SD card / `/media/fat`; SMB was dropped — the bundled
  `@marsaud/smb2` only speaks NTLMv1 and the MiSTer's Samba is NTLMv2-only)

## Commands
- `npm run dev` — run app in dev
- `npm run test` — Vitest (run mode, never watch)
- `npm run package` — electron-builder for the current OS

## Conventions
- TDD: failing test first. Conventional Commits. No Co-Authored-By trailer.
- Squash per-task commits into one clean commit before the first public push.

## Device-verified protocol (mrext Remote v0.4 @ MiSTer, 2026-06)

REST + WebSocket confirmed against a real MiSTer. The mrext API base is `http://<ip>:8182/api`:

- **Status** is split across two endpoints (there is NO `/api/status`):
  - `GET /api/sysinfo` → `{hostname, ips:[], dns, version, disks:[{path,total,used,free,displayName}]}`
    (disk = the entry with `path == "/media/fat"`; `ip` = `ips[0]`)
  - `GET /api/games/playing` → `{core, system, systemName, game, gameName}` (empty strings → null)
- **Launch:** `POST /api/games/launch` with `{ "path": "..." }`
- **Reboot:** `POST /api/settings/system/reboot`
- **WebSocket** `ws://<ip>:8182/api/ws` sends plain **text tokens** (not JSON):
  `coreRunning:<CORE>`, `gameRunning:<GAME>` (empty when none), `indexStatus:...` (ignored).

### SSH / Files (verified)
- SSH + SFTP work with the MiSTer's default credentials **root / 1** (NTLMv2-only Samba
  rejects the bundled SMB client, so files are browsed over SFTP under `/media/fat`).
- The connect flow defaults discovered devices to `root`/`1`; a credentials UI to override
  is a sensible follow-up.

### Still pending verification
- PROBE_COMMAND paths (/proc/uptime, /proc/loadavg, /proc/meminfo MemAvailable, thermal_zone0)
  not yet confirmed on a real MiSTer image — see plan Task 6 Step 9.
