import { useState } from 'react'
import { toast } from 'sonner'
import { Play, Power } from 'lucide-react'
import { api } from '../api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '../components/ui/dialog'

export function ControlTab(): JSX.Element {
  const [path, setPath] = useState('')

  const launch = () => {
    api.launchGame(path)
    toast.success('Launch sent', { description: path })
  }

  const doReboot = async () => {
    await api.reboot()
    toast.success('Reboot sent')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Control</h1>
        <p className="text-sm text-muted-foreground">Launch games and manage power</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="size-4 text-primary" /> Launch a game
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder="Path to game (e.g. /media/fat/games/SNES/Zelda.sfc)"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && path && launch()}
          />
          <Button onClick={launch} disabled={!path}>
            Launch
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Power className="size-4 text-destructive" /> Power
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Power /> Reboot MiSTer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reboot MiSTer?</DialogTitle>
                <DialogDescription>
                  This restarts the device. Any unsaved game state may be lost.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" onClick={doReboot}>
                    Confirm reboot
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
