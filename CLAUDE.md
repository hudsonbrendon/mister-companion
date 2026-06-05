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

- REST_PATHS (status/launch/reboot) and status field mapping not yet confirmed against a real device — see plan Task 3 Step 6.
- PROBE_COMMAND paths (/proc/uptime, /proc/loadavg, /proc/meminfo MemAvailable, thermal_zone0) not yet confirmed on a real MiSTer image — see plan Task 6 Step 9.
