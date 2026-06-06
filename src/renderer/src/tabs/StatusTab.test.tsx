import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { StatusTab } from './StatusTab'
import { StatusProvider } from '../hooks/status-context'
import { emptyStatus } from '@shared/types'

let pushStatus: (s: any) => void = () => {}

beforeEach(() => {
  (globalThis as any).window.api = {
    startStatusFeed: vi.fn().mockResolvedValue(true),
    sshProbe: vi.fn().mockResolvedValue({
      uptimeSeconds: 7200,
      loadAvg: 1.1,
      load5: 0.9,
      load15: 0.7,
      memTotalKb: 504096,
      memFreeKb: 422440,
      swapTotalKb: 0,
      swapFreeKb: 0,
      temperatureC: 52.4,
      cpuCount: 2,
      cpuModel: 'Altera SOCFPGA',
      cpuMhz: 800,
      procCount: 137,
      kernel: '5.15.1-MiSTer',
      raw: {}
    }),
    onStatusUpdate: (cb: (s: any) => void) => {
      pushStatus = cb
      return () => {}
    }
  }
})

describe('StatusTab dashboard', () => {
  it('shows Offline first, then live core/game, disk usage and SSH telemetry', async () => {
    render(
      <StatusProvider>
        <StatusTab />
      </StatusProvider>
    )
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
    await act(async () => {
      pushStatus({
        ...emptyStatus(),
        online: true,
        core: 'SNES',
        game: 'Chrono Trigger',
        hostname: 'MiSTer',
        ip: '192.168.0.10',
        ips: ['192.168.0.10', '10.0.0.5'],
        dns: '192.168.0.1',
        diskTotal: 32_000_000_000,
        diskUsed: 24_000_000_000,
        diskFree: 8_000_000_000
      })
    })
    expect(screen.getByText('SNES')).toBeInTheDocument()
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument()
    expect(screen.getByText(/24\.0 GB/)).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(1)
    // network details from REST
    expect(screen.getByText('192.168.0.1')).toBeInTheDocument()
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument()
    // SSH telemetry polled once online
    await waitFor(() => expect(screen.getByText('5.15.1-MiSTer')).toBeInTheDocument())
    expect(screen.getByText('2h 0m')).toBeInTheDocument()
    // enriched telemetry: temperature, CPU, processes, multi-load
    expect(screen.getByText(/52\.4 °C/)).toBeInTheDocument()
    expect(screen.getByText(/Altera SOCFPGA/)).toBeInTheDocument()
    expect(screen.getByText('137')).toBeInTheDocument()
    expect(screen.getByText(/1\.10 · 0\.90 · 0\.70/)).toBeInTheDocument()
  })
})
