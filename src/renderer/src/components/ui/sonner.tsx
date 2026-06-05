import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'group border-border bg-card text-card-foreground',
          description: 'text-muted-foreground'
        }
      }}
    />
  )
}
