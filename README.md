<div align="center">
  <img src="assets/logo.png" alt="MiSTer Companion" width="180" />

  # MiSTer Companion
</div>

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

## Install

### macOS — Homebrew (recommended)

```bash
brew install --cask hudsonbrendon/tap/mister-companion
```

Opens with a normal double-click, **no Gatekeeper prompt** — the tap clears the download
quarantine on install, so you don't need a paid Apple notarization. Apple Silicon only.
Update later with `brew upgrade --cask mister-companion`.

### macOS — direct download

Grab the `.dmg` from the [latest release](https://github.com/hudsonbrendon/mister-companion/releases/latest).
Because the build isn't Apple-notarized, macOS shows *"Apple could not verify… is free of
malware"* on first launch. Either:

- click **Done**, then **System Settings → Privacy & Security → Open Anyway**, or
- clear the quarantine yourself:
  ```bash
  xattr -cr "/Applications/MiSTer Companion.app"
  ```

The app is ad-hoc signed, so it never shows the older *"is damaged"* error.

### Windows / Linux

Download the `.exe` (Windows) or `.AppImage` (Linux) from the
[latest release](https://github.com/hudsonbrendon/mister-companion/releases/latest).
On Windows, SmartScreen shows *"Windows protected your PC"* — click **More info → Run anyway**.

## Develop

```bash
npm install
npm run dev      # run the app
npm run test     # Vitest
npm run package  # build installer for the current OS
```

## Supported platforms

macOS, Windows, Linux.

## License

MIT © Hudson Brendon
