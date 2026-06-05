import { useState } from 'react'
import { toast } from 'sonner'
import { Trophy, Medal, Award, CheckCircle2, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { RaSummary, RaRecentUnlock, RaGameDetail } from '@shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Progress } from '../components/ui/progress'
import { ScrollArea } from '../components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { cn } from '../lib/utils'

export function RATab(): JSX.Element {
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [summary, setSummary] = useState<RaSummary | null>(null)
  const [recent, setRecent] = useState<RaRecentUnlock[]>([])
  const [detail, setDetail] = useState<RaGameDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  const load = () => {
    setLoading(true)
    Promise.all([
      api.raSummary(username, apiKey),
      api.raRecent(username, apiKey, 1440).catch(() => [])
    ])
      .then(([s, r]) => {
        setSummary(s)
        setRecent(r)
      })
      .catch((e) => toast.error(t('ra.error', { msg: String(e) })))
      .finally(() => setLoading(false))
  }

  const openGame = (gameId: number) => {
    setDetail(null)
    setDetailOpen(true)
    api
      .raGameProgress(username, apiKey, gameId)
      .then(setDetail)
      .catch((e) => {
        setDetailOpen(false)
        toast.error(t('ra.error', { msg: String(e) }))
      })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.ra')}</h1>
        <p className="text-sm text-muted-foreground">{t('ra.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('ra.credentials')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            className="w-48"
            placeholder={t('ra.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            className="w-48"
            type="password"
            placeholder={t('ra.apiKey')}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <Button onClick={load} disabled={!username || !apiKey || loading}>
            {loading ? t('ra.loading') : t('ra.load')}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card className="shadow-glow-pink">
              <CardContent className="flex items-center gap-4 p-5">
                <Trophy className="size-7 text-pink" />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{t('ra.hardcorePoints')}</div>
                  <div className="font-mono text-2xl font-bold">{summary.hardcorePoints}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <Medal className="size-7 text-primary" />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{t('ra.rank')}</div>
                  <div className="font-mono text-2xl font-bold">#{summary.rank}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{t('ra.softcore')}</div>
                  <div className="font-mono text-2xl font-bold">{summary.softcorePoints}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {summary.recentGames.map((g) => (
              <Card
                key={g.gameId}
                onClick={() => openGame(g.gameId)}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-glow"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  {g.iconUrl && (
                    <img src={g.iconUrl} alt="" className="size-12 rounded-md" width={48} height={48} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{g.title}</div>
                    <div className="text-xs text-muted-foreground">{g.console}</div>
                    <Progress value={g.percent} className="mt-2" />
                  </div>
                  <div className="shrink-0 font-mono text-sm text-muted-foreground">
                    {g.numAchieved}/{g.numPossible}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="size-4 text-pink" /> {t('ra.recentUnlocks')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('ra.noRecent')}</p>
              ) : (
                <ul className="space-y-2">
                  {recent.map((a, i) => (
                    <li key={`${a.gameId}-${i}`} className="flex items-center gap-3 rounded-md border border-border p-2.5">
                      {a.badgeUrl && <img src={a.badgeUrl} alt="" className="size-9 rounded" width={36} height={36} />}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{a.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{a.gameTitle} · {a.console}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-sm text-pink">+{a.points}</div>
                        <div className="text-[10px] text-muted-foreground">{a.date}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{detail?.title ?? '…'}</DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.console} · ${t('ra.of', { n: detail.numAwarded, total: detail.numAchievements })}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[26rem]">
            <ul className="space-y-2 pr-3">
              {(detail?.achievements ?? []).map((ac) => (
                <li
                  key={ac.id}
                  className={cn(
                    'flex items-center gap-3 rounded-md border border-border p-2.5',
                    ac.earned ? '' : 'opacity-50'
                  )}
                >
                  {ac.badgeUrl ? (
                    <img
                      src={ac.badgeUrl}
                      alt=""
                      className={cn('size-10 rounded', ac.earned ? '' : 'grayscale')}
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="grid size-10 place-items-center rounded bg-muted">
                      <Lock className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{ac.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{ac.description}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{ac.points}</span>
                    {ac.earned && <CheckCircle2 className="size-4 text-emerald-400" />}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
