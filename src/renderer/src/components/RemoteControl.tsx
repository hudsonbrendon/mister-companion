import {
  Gamepad2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Undo2,
  LayoutGrid,
  Menu,
  Home,
  User,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

// Sends mrext virtual-keyboard keys to the running core / MiSTer OSD.
export function RemoteControl(): JSX.Element {
  const { t } = useTranslation()
  const press = (key: string) => () => { void api.sendKey(key) }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gamepad2 className="size-4 text-primary" /> {t('control.remote')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-12 gap-y-6">
        {/* D-pad */}
        <div className="grid grid-cols-3 gap-1.5">
          <span />
          <Button variant="secondary" size="icon" onClick={press('up')} aria-label="Up"><ChevronUp /></Button>
          <span />
          <Button variant="secondary" size="icon" onClick={press('left')} aria-label="Left"><ChevronLeft /></Button>
          <Button size="icon" onClick={press('enter')} aria-label="OK"><CornerDownLeft /></Button>
          <Button variant="secondary" size="icon" onClick={press('right')} aria-label="Right"><ChevronRight /></Button>
          <span />
          <Button variant="secondary" size="icon" onClick={press('down')} aria-label="Down"><ChevronDown /></Button>
          <span />
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={press('back')}><Undo2 className="size-4" /> {t('control.back')}</Button>
          <Button variant="outline" size="sm" onClick={press('osd')}><LayoutGrid className="size-4" /> OSD</Button>
          <Button variant="outline" size="sm" onClick={press('menu')}><Menu className="size-4" /> Menu</Button>
          <Button variant="outline" size="sm" onClick={press('home')}><Home className="size-4" /> Home</Button>
          <Button variant="outline" size="sm" onClick={press('user')}><User className="size-4" /> User</Button>
          <Button variant="outline" size="sm" onClick={press('reset')}><RotateCcw className="size-4" /> Reset</Button>
          <Button variant="ghost" size="icon" onClick={press('volume_down')} aria-label="Volume down"><VolumeX /></Button>
          <Button variant="ghost" size="icon" onClick={press('volume_up')} aria-label="Volume up"><Volume2 /></Button>
        </div>
      </CardContent>
    </Card>
  )
}
