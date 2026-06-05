import { motion } from 'framer-motion'
import { Card, CardContent } from './ui/card'
import { cn } from '../lib/utils'

export function StatCard({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent?: 'primary' | 'pink'
}): JSX.Element {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <Card className="h-full transition-shadow hover:shadow-glow">
        <CardContent className="flex items-center gap-4 p-5">
          <div
            className={cn(
              'grid size-10 place-items-center rounded-lg',
              accent === 'pink' ? 'bg-pink/15 text-pink' : 'bg-primary/15 text-primary'
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="truncate font-mono text-lg font-semibold">{value}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
