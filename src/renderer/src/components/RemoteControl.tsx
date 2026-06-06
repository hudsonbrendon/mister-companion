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

// Sends mrext virtual-keyboard keys to the running core / MiSTer OSD. Rendered large and
// centered as the focus of the Control tab.
export function RemoteControl(): JSX.Element {
  const { t } = useTranslation()
  const press = (key: string) => () => {
    void api.sendKey(key)
  }

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2 text-base">
          <Gamepad2 className="size-5 text-primary" /> {t('control.remote')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-8 pb-8">
        {/* D-pad */}
        <div className="grid grid-cols-3 gap-2">
          <span />
          <Button variant="secondary" size="icon" className="size-16" onClick={press('up')} aria-label="Up">
            <ChevronUp className="size-8" />
          </Button>
          <span />
          <Button variant="secondary" size="icon" className="size-16" onClick={press('left')} aria-label="Left">
            <ChevronLeft className="size-8" />
          </Button>
          <Button size="icon" className="size-16" onClick={press('enter')} aria-label="OK">
            <CornerDownLeft className="size-8" />
          </Button>
          <Button variant="secondary" size="icon" className="size-16" onClick={press('right')} aria-label="Right">
            <ChevronRight className="size-8" />
          </Button>
          <span />
          <Button variant="secondary" size="icon" className="size-16" onClick={press('down')} aria-label="Down">
            <ChevronDown className="size-8" />
          </Button>
          <span />
        </div>

        {/* Action buttons */}
        <div className="grid w-full max-w-sm grid-cols-3 gap-2">
          <Button variant="outline" onClick={press('back')}>
            <Undo2 className="size-4" /> {t('control.back')}
          </Button>
          <Button variant="outline" onClick={press('osd')}>
            <LayoutGrid className="size-4" /> OSD
          </Button>
          <Button variant="outline" onClick={press('menu')}>
            <Menu className="size-4" /> Menu
          </Button>
          <Button variant="outline" onClick={press('home')}>
            <Home className="size-4" /> Home
          </Button>
          <Button variant="outline" onClick={press('user')}>
            <User className="size-4" /> User
          </Button>
          <Button variant="outline" onClick={press('reset')}>
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="size-12" onClick={press('volume_down')} aria-label="Volume down">
            <VolumeX className="size-6" />
          </Button>
          <Button variant="ghost" size="icon" className="size-12" onClick={press('volume_up')} aria-label="Volume up">
            <Volume2 className="size-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
