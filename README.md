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
