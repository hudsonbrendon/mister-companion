import { useState } from 'react'
import { toast } from 'sonner'
import { Trophy, Medal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { RaSummary } from '@shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Progress } from '../components/ui/progress'

export function RATab(): JSX.Element {
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [summary, setSummary] = useState<RaSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  const load = () => {
    setLoading(true)
    api
      .raSummary(username, apiKey)
      .then((s) => setSummary(s))
      .catch((e) => toast.error(t('ra.error', { msg: String(e) })))
      .finally(() => setLoading(false))
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
              <Card key={g.gameId}>
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
        </>
      )}
    </div>
  )
}
