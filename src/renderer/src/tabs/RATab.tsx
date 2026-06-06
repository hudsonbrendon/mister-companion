import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Trophy, Medal, Award, CheckCircle2, Lock, RefreshCw, LinkIcon, Unlink,
  Star, Gamepad2, CalendarDays, Clock, History, AlertTriangle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { RaSummary, RaRecentUnlock, RaGameDetail } from '@shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Progress } from '../components/ui/progress'
import { StatusDot } from '../components/StatusDot'
import { ScrollArea } from '../components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { cn } from '../lib/utils'

// A linked RA account is persisted locally so it survives closing the tab / app and the
// data reloads automatically. The mrext API has no RA store; we keep our own in
// localStorage, mirroring theme.ts / library-store.ts.
const RA_USER_KEY = 'ra.username'
const RA_KEY_KEY = 'ra.apiKey'
// Auto-sync interval — refetch the linked account's progress periodically (real-time-ish).
const REFRESH_MS = 60_000

interface RaAccount {
  username: string
  apiKey: string
}

const readAccount = (): RaAccount | null => {
  if (typeof localStorage === 'undefined') return null
  const username = localStorage.getItem(RA_USER_KEY) ?? ''
  const apiKey = localStorage.getItem(RA_KEY_KEY) ?? ''
  return username && apiKey ? { username, apiKey } : null
}

export function RATab(): JSX.Element {
  const [account, setAccount] = useState<RaAccount | null>(() => readAccount())
  const [draftUser, setDraftUser] = useState('')
  const [draftKey, setDraftKey] = useState('')
  const [summary, setSummary] = useState<RaSummary | null>(null)
  const [recent, setRecent] = useState<RaRecentUnlock[]>([])
  const [detail, setDetail] = useState<RaGameDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { t, i18n } = useTranslation()

  const load = useCallback(
    (acc: RaAccount) => {
      setLoading(true)
      return Promise.all([
        api.raSummary(acc.username, acc.apiKey),
        api.raRecent(acc.username, acc.apiKey, 1440).catch(() => [])
      ])
        .then(([s, r]) => {
          setSummary(s)
          setRecent(r)
          setLastUpdated(Date.now())
        })
        .catch((e) => toast.error(t('ra.error', { msg: String(e) })))
        .finally(() => setLoading(false))
    },
    [t]
  )

  // Auto-load on mount / whenever an account becomes linked, then poll for live updates.
  useEffect(() => {
    if (!account) return
    load(account)
    const id = setInterval(() => load(account), REFRESH_MS)
    return () => clearInterval(id)
  }, [account, load])

  const link = () => {
    const acc = { username: draftUser.trim(), apiKey: draftKey.trim() }
    if (!acc.username || !acc.apiKey) return
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RA_USER_KEY, acc.username)
      localStorage.setItem(RA_KEY_KEY, acc.apiKey)
    }
    setAccount(acc)
  }

  const unlink = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RA_USER_KEY)
      localStorage.removeItem(RA_KEY_KEY)
    }
    setConfirmOpen(false)
    setAccount(null)
    setSummary(null)
    setRecent([])
    setLastUpdated(null)
    setDraftUser('')
    setDraftKey('')
  }

  const fmtTime = (ms: number): string =>
    new Date(ms).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // RA's GetUserSummary `Status` field is legacy and reads "Offline" even while playing,
  // so we derive presence from the rich-presence message instead — that's what actually
  // updates as you play. Empty / "Unknown" / "Offline" / "Not playing" mean idle.
  const rp = summary?.richPresence?.trim() ?? ''
  const playing = rp.length > 0 && !/^(unknown|offline|not playing|not currently)/i.test(rp)

  const openGame = (gameId: number) => {
    if (!account) return
    setDetail(null)
    setDetailOpen(true)
    api
      .raGameProgress(account.username, account.apiKey, gameId)
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

      {!account ? (
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">{t('ra.addAccount')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Input
              className="h-11 w-full max-w-xs text-center text-base"
              placeholder={t('ra.username')}
              value={draftUser}
              onChange={(e) => setDraftUser(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && link()}
            />
            <Input
              className="h-11 w-full max-w-xs text-center text-base"
              type="password"
              placeholder={t('ra.apiKey')}
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && link()}
            />
            <Button
              className="w-full max-w-xs"
              onClick={link}
              disabled={!draftUser.trim() || !draftKey.trim()}
            >
              <LinkIcon className="mr-2 size-4" /> {t('ra.save')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {summary?.userPic ? (
                <img
                  src={summary.userPic}
                  alt=""
                  className="size-14 rounded-full border-2 border-pink/40 object-cover"
                  width={56}
                  height={56}
                />
              ) : (
                <div className="grid size-14 place-items-center rounded-full bg-muted">
                  <Trophy className="size-6 text-pink" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">{summary?.user ?? account.username}</div>
                {summary?.motto && (
                  <div className="truncate text-sm italic text-muted-foreground">“{summary.motto}”</div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <StatusDot online={playing} />
                    {playing ? t('ra.playing') : t('ra.offlineStatus')}
                  </span>
                  {summary?.memberSince && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {t('ra.memberSince', { date: summary.memberSince.split(' ')[0] })}
                    </span>
                  )}
                  {lastUpdated != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {t('ra.lastUpdated', { time: fmtTime(lastUpdated) })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => load(account)} disabled={loading}>
                <RefreshCw className={cn('mr-2 size-4', loading && 'animate-spin')} />
                {t('ra.refreshNow')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
                <Unlink className="mr-2 size-4" /> {t('ra.unlink')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {account && summary?.richPresence && (
        <Card className="border-pink/30 bg-pink/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Gamepad2 className="size-5 shrink-0 text-pink" />
            <div className="min-w-0">
              <div className="text-xs uppercase text-muted-foreground">{t('ra.nowPlaying')}</div>
              <div className="truncate text-sm font-medium">{summary.richPresence}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {account && summary && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Card className="shadow-glow-pink">
              <CardContent className="flex items-center gap-3 p-5">
                <Trophy className="size-7 shrink-0 text-pink" />
                <div className="min-w-0">
                  <div className="text-xs uppercase text-muted-foreground">{t('ra.hardcorePoints')}</div>
                  <div className="font-mono text-2xl font-bold">{summary.hardcorePoints.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Star className="size-7 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <div className="text-xs uppercase text-muted-foreground">{t('ra.retroPoints')}</div>
                  <div className="font-mono text-2xl font-bold">{summary.truePoints.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Medal className="size-7 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="text-xs uppercase text-muted-foreground">{t('ra.rank')}</div>
                  <div className="font-mono text-2xl font-bold">
                    #{summary.rank.toLocaleString()}
                    {summary.totalRanked > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        / {summary.totalRanked.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Award className="size-7 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs uppercase text-muted-foreground">{t('ra.softcore')}</div>
                  <div className="font-mono text-2xl font-bold">{summary.softcorePoints.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <History className="size-7 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs uppercase text-muted-foreground">{t('ra.recentlyPlayed')}</div>
                  <div className="font-mono text-2xl font-bold">{summary.recentlyPlayedCount.toLocaleString()}</div>
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> {t('ra.unlinkConfirmTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('ra.unlinkConfirmBody', { user: account?.username ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('ra.cancel')}
            </Button>
            <Button variant="destructive" onClick={unlink}>
              <Unlink className="mr-2 size-4" /> {t('ra.unlinkConfirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
