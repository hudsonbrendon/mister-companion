import { cn } from '../lib/utils'

export function StatusDot({ online }: { online: boolean }): JSX.Element {
  return (
    <span className="relative flex size-2.5">
      {online && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-pink/70 animate-pulse-ring" />
      )}
      <span
        aria-hidden
        className={cn('relative inline-flex size-2.5 rounded-full', online ? 'bg-pink' : 'bg-muted-foreground/50')}
      />
    </span>
  )
}
