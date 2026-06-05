# MiSTer Companion — UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely redesign the renderer UI into a rich, modern, highly interactive desktop experience — a left **sidebar** layout, a **dark-cyber** theme (purple `#6c4cff` + pink `#ff5db1`), built on **Tailwind CSS + shadcn/ui (Radix)** with **Framer Motion** micro-interactions — and brand the app with the cat/laptop logo (app icon + README).

**Architecture:** The renderer keeps its current data contract untouched — every screen still talks to the main process only through `window.api` (the typed `RendererApi` Proxy). This is a **presentation-layer rewrite**: we add a design-system foundation (Tailwind + shadcn primitives in `src/renderer/src/components/ui/`), replace the tab shell with a sidebar shell, and rebuild each of the five screens as rich components. Behavioral test contracts (api calls, accessible names, placeholders, `role="tab"`) are preserved so the existing Vitest suite keeps protecting behavior while the visuals change.

**Tech Stack:** Tailwind CSS 3.4 + tailwindcss-animate, shadcn/ui-style components on Radix UI primitives, `class-variance-authority` + `clsx` + `tailwind-merge`, `lucide-react` icons, `framer-motion`, `sonner` (toasts). No changes to the Electron main/preload layers except the app icon.

---

## Conventions used in every task

- **Package manager:** `npm`. `npm run test` = `vitest run` (never watch).
- **TDD-for-UI:** these are presentation changes. The discipline here is: **the existing behavioral tests must stay green**, and where a redesign changes structure, update the test *first* to express the new accessible contract, watch it fail, then implement. Never weaken an assertion just to make it pass (e.g. don't delete an `api.launchGame` check).
- **Commits:** Conventional Commits. **No `Co-Authored-By` trailer** (user preference).
- **Branch:** work on `main` (solo repo, already published). Commit per task.
- **Accessibility is the test surface:** query by `role`/accessible-name/placeholder/text, not by class names. Keep `role="tablist"`/`role="tab"`/`aria-selected` on the sidebar nav so structural queries remain stable.
- **Do not touch** `src/main/**`, `src/preload/**`, `src/shared/**` except the icon config in Task 3. The `RendererApi` in `src/renderer/src/api.ts` stays as-is (Proxy over `window.api`).
- After each task run the **full** suite (`npm run test`) — all suites stay green — plus `npm run build` (electron-vite) on tasks that change config.

### jsdom gotchas (handled in Task 2)

Radix + sonner + framer-motion need browser APIs jsdom lacks. Task 2 adds polyfills to `tests/setup.ts`: `matchMedia`, `ResizeObserver`, `Element.prototype.scrollIntoView`, and Radix pointer-capture noops (`hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`). Every later UI test depends on these being present.

---

## File Structure

```
mister-companion/
├── assets/logo.png                         # source logo (already committed in prep)
├── build/icon.png                          # 1024² app icon (generated from logo) — Task 3
├── tailwind.config.js                      # Task 1
├── postcss.config.js                       # Task 1
├── components.json                         # shadcn config (informational) — Task 2
├── README.md                               # + logo — Task 3
├── electron-builder.yml                    # + icon — Task 3
└── src/renderer/
    ├── index.html
    └── src/
        ├── main.tsx                        # import './index.css'  — Task 1
        ├── index.css                       # Tailwind + dark-cyber tokens — Task 1 (replaces styles.css)
        ├── lib/utils.ts                    # cn() — Task 2
        ├── lib/format.ts                   # gb(), bytes helpers — Task 6
        ├── api.ts                          # UNCHANGED
        ├── hooks/useStatus.ts              # UNCHANGED (consumed by new StatusScreen)
        ├── components/
        │   ├── ui/                         # shadcn primitives — Task 2
        │   │   ├── button.tsx
        │   │   ├── card.tsx
        │   │   ├── badge.tsx
        │   │   ├── input.tsx
        │   │   ├── tooltip.tsx
        │   │   ├── scroll-area.tsx
        │   │   ├── progress.tsx
        │   │   ├── skeleton.tsx
        │   │   ├── dialog.tsx
        │   │   └── sonner.tsx               # <Toaster/>
        │   ├── Sidebar.tsx                  # Task 4
        │   ├── StatusDot.tsx               # live connection pulse — Task 4
        │   └── StatCard.tsx                # reusable metric card — Task 6
        ├── App.tsx                         # sidebar shell + motion routing — Task 4
        └── tabs/                           # rebuilt screens
            ├── StatusTab.tsx               # Task 6
            ├── ControlTab.tsx              # Task 7
            ├── ScriptsTab.tsx              # Task 8
            ├── FilesTab.tsx                # Task 9
            └── RATab.tsx                   # Task 10
```

`src/renderer/src/styles.css` is deleted in Task 1 (replaced by `index.css`).

---

# Phase 0 — Design-system foundation

### Task 1: Tailwind + PostCSS + dark-cyber theme tokens

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`
- Create: `src/renderer/src/index.css`
- Modify: `src/renderer/src/main.tsx`
- Delete: `src/renderer/src/styles.css`

- [ ] **Step 1: Install Tailwind toolchain**

Run:
```bash
npm install -D tailwindcss@3.4.17 postcss@8.4.49 autoprefixer@10.4.20 tailwindcss-animate@1.0.7
```
Expected: added to devDependencies, no errors.

- [ ] **Step 2: Write `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

- [ ] **Step 3: Write `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        pink: { DEFAULT: 'hsl(var(--pink))', foreground: 'hsl(var(--pink-foreground))' }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        glow: '0 0 0 1px hsl(var(--primary) / 0.4), 0 0 24px -4px hsl(var(--primary) / 0.55)',
        'glow-pink': '0 0 0 1px hsl(var(--pink) / 0.4), 0 0 24px -4px hsl(var(--pink) / 0.55)'
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 hsl(var(--pink) / 0.55)' },
          '70%': { boxShadow: '0 0 0 8px hsl(var(--pink) / 0)' },
          '100%': { boxShadow: '0 0 0 0 hsl(var(--pink) / 0)' }
        }
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
```

- [ ] **Step 4: Write `src/renderer/src/index.css`** (dark-cyber tokens; app is always dark)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 252 26% 9%;
  --foreground: 250 30% 92%;
  --card: 252 24% 13%;
  --card-foreground: 250 30% 92%;
  --primary: 252 100% 65%;
  --primary-foreground: 0 0% 100%;
  --secondary: 252 18% 20%;
  --secondary-foreground: 250 30% 92%;
  --muted: 252 16% 18%;
  --muted-foreground: 250 12% 65%;
  --accent: 252 30% 22%;
  --accent-foreground: 250 30% 96%;
  --destructive: 0 72% 55%;
  --destructive-foreground: 0 0% 100%;
  --pink: 327 100% 68%;
  --pink-foreground: 0 0% 100%;
  --border: 252 18% 22%;
  --input: 252 18% 24%;
  --ring: 252 100% 65%;
  --radius: 0.75rem;
}

* { border-color: hsl(var(--border)); }

html, body, #root { height: 100%; }

body {
  margin: 0;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Subtle radial purple ambience behind the app */
#root {
  background:
    radial-gradient(1100px 700px at 12% -10%, hsl(252 60% 22% / 0.5), transparent 60%),
    radial-gradient(900px 600px at 110% 0%, hsl(327 60% 24% / 0.28), transparent 55%);
}

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.5); }
```

- [ ] **Step 5: Update `src/renderer/src/main.tsx`** to import the new stylesheet

Replace the first line `import './styles.css'` with:
```tsx
import './index.css'
```
(Leave the rest of `main.tsx` unchanged.)

- [ ] **Step 6: Delete the old stylesheet**

Run:
```bash
git rm src/renderer/src/styles.css
```

- [ ] **Step 7: Verify build and tests**

Run:
```bash
npm run build
npm run test
```
Expected: `electron-vite build` succeeds (Tailwind compiles, CSS emitted); all existing tests still pass (Tailwind/CSS does not affect jsdom assertions).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): add Tailwind + dark-cyber theme tokens, drop legacy stylesheet"
```

---

### Task 2: shadcn/ui primitives + jsdom test polyfills

**Files:**
- Create: `src/renderer/src/lib/utils.ts`
- Create: `src/renderer/src/components/ui/{button,card,badge,input,tooltip,scroll-area,progress,skeleton,dialog,sonner}.tsx`
- Create: `components.json`
- Modify: `tests/setup.ts`
- Test: `src/renderer/src/components/ui/button.test.tsx`

- [ ] **Step 1: Install runtime deps**

Run:
```bash
npm install class-variance-authority@0.7.1 clsx@2.1.1 tailwind-merge@2.6.0 lucide-react@0.469.0 framer-motion@11.15.0 sonner@1.7.1 \
  @radix-ui/react-slot@1.1.1 @radix-ui/react-tooltip@1.1.6 @radix-ui/react-dialog@1.1.4 @radix-ui/react-scroll-area@1.2.2 @radix-ui/react-progress@1.1.1
```
Expected: added to dependencies, no errors.

- [ ] **Step 2: Add jsdom polyfills to `tests/setup.ts`**

Append to the existing `tests/setup.ts` (keep the existing `import '@testing-library/jest-dom/vitest'` line):
```ts
import { vi } from 'vitest'

// Radix/sonner/framer-motion need browser APIs jsdom lacks.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}
// Radix pointer-capture calls
Element.prototype.hasPointerCapture = vi.fn()
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()
```

- [ ] **Step 3: Write `src/renderer/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Write `components.json`** (informational shadcn config)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/renderer/src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": { "components": "src/renderer/src/components", "utils": "src/renderer/src/lib/utils" }
}
```

- [ ] **Step 5: Write the UI primitives**

`src/renderer/src/components/ui/button.tsx`:
```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        pink: 'bg-pink text-pink-foreground hover:bg-pink/90 hover:shadow-glow-pink',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-6',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'
export { buttonVariants }
```

`src/renderer/src/components/ui/card.tsx`:
```tsx
import * as React from 'react'
import { cn } from '../../lib/utils'

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)} {...props} />
  )
)
Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
)
CardTitle.displayName = 'CardTitle'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
)
CardContent.displayName = 'CardContent'
```

`src/renderer/src/components/ui/badge.tsx`:
```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary',
        pink: 'border-transparent bg-pink/15 text-pink',
        muted: 'border-border bg-muted text-muted-foreground',
        success: 'border-transparent bg-emerald-500/15 text-emerald-400'
      }
    },
    defaultVariants: { variant: 'default' }
  }
)

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
```

`src/renderer/src/components/ui/input.tsx`:
```tsx
import * as React from 'react'
import { cn } from '../../lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
```

`src/renderer/src/components/ui/tooltip.tsx`:
```tsx
import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../lib/utils'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md border border-border bg-card px-3 py-1.5 text-xs text-card-foreground shadow-md',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = 'TooltipContent'
```

`src/renderer/src/components/ui/scroll-area.tsx`:
```tsx
import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { cn } from '../../lib/utils'

export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">{children}</ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar orientation="vertical" className="flex touch-none select-none p-0.5">
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = 'ScrollArea'
```

`src/renderer/src/components/ui/progress.tsx`:
```tsx
import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '../../lib/utils'

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-muted', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full w-full flex-1 rounded-full bg-primary transition-all', indicatorClassName)}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = 'Progress'
```

`src/renderer/src/components/ui/skeleton.tsx`:
```tsx
import { cn } from '../../lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted/70', className)} {...props} />
}
```

`src/renderer/src/components/ui/dialog.tsx`:
```tsx
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-card p-6 shadow-glow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5', className)} {...props} />
}
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
))
DialogTitle.displayName = 'DialogTitle'
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'
```

`src/renderer/src/components/ui/sonner.tsx`:
```tsx
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
```

- [ ] **Step 6: Write a smoke test** for the design system + polyfills

`src/renderer/src/components/ui/button.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button primitive', () => {
  it('renders its label and fires onClick', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Launch</Button>)
    const btn = screen.getByRole('button', { name: /launch/i })
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('supports asChild to render a different element', () => {
    render(
      <Button asChild>
        <a href="#go">Go</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: /go/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run the smoke test, then the full suite**

Run: `npm run test -- src/renderer/src/components/ui/button.test.tsx`
Expected: PASS (2 tests).
Run: `npm run test`
Expected: all suites green (polyfills don't break existing tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): add shadcn/ui primitives, cn util, and jsdom test polyfills"
```

---

# Phase 1 — Branding (app icon + README)

### Task 3: App icon from the logo + README hero

**Files:**
- Create: `build/icon.png`
- Modify: `electron-builder.yml`, `README.md`, `src/main/index.ts`
- Test: (manual build check — no unit test)

- [ ] **Step 1: Generate a 1024² app icon from the committed logo**

The source `assets/logo.png` is 1254×1254. Resize to the icon size electron-builder expects:
```bash
sips -z 1024 1024 assets/logo.png --out build/icon.png
sips -g pixelWidth -g pixelHeight build/icon.png
```
Expected: `pixelWidth: 1024`, `pixelHeight: 1024`. (electron-builder generates per-platform icons — `.icns`/`.ico` — from this single PNG; `directories.buildResources: build` is already set so it is auto-discovered.)

- [ ] **Step 2: Pin the icon explicitly in `electron-builder.yml`**

Add `icon: build/icon.png` to each platform block so it is unambiguous. Change the `mac`, `win`, and `linux` blocks to:
```yaml
mac:
  target: [dmg]
  category: public.app-category.utilities
  identity: null
  icon: build/icon.png
win:
  target: [nsis]
  icon: build/icon.png
linux:
  target: [AppImage]
  category: Utility
  icon: build/icon.png
```
(Leave `afterPack`, `publish`, `appId`, `productName`, `directories`, `files` unchanged.)

- [ ] **Step 3: Set the dev/runtime window icon (Linux) in `src/main/index.ts`**

In `createWindow()`, add an `icon` to the `BrowserWindow` options. At the top of `src/main/index.ts` the imports already include `join` from `node:path`. In the `new BrowserWindow({ ... })` call, add the `icon` property next to `width/height`:
```ts
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
```
(This is cosmetic for the Linux window/taskbar; macOS/Windows use the packaged icon. Leave everything else in the file unchanged.)

- [ ] **Step 4: Add the logo to the README**

At the very top of `README.md`, replace the first heading line `# MiSTer Companion` with a centered hero block:
```markdown
<div align="center">
  <img src="assets/logo.png" alt="MiSTer Companion" width="180" />

  # MiSTer Companion
</div>
```
(Leave the rest of the README content unchanged.)

- [ ] **Step 5: Verify the build picks up the icon**

Run:
```bash
npm run build
npx electron-builder --dir --publish never
```
Expected: `electron-vite build` succeeds and `electron-builder --dir` produces an unpacked app whose icon is the cat logo (on macOS the `.app` icon updates; check `dist/mac*/MiSTer Companion.app`). If `electron-builder --dir` fails for environment reasons (no codesign cert, etc.), that is acceptable — confirm it at least processed the icon (look for `dist/.icon-ico`/`dist/.icon-icns` generated artifacts) and note any environment limitation.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(brand): app icon from logo + README hero + window icon"
```

---

# Phase 2 — Sidebar shell

### Task 4: Sidebar layout shell with Framer Motion routing

**Files:**
- Create: `src/renderer/src/components/StatusDot.tsx`
- Create: `src/renderer/src/components/Sidebar.tsx`
- Modify: `src/renderer/src/App.tsx`
- Test: `src/renderer/src/App.test.tsx`

**Context:** The app moves from top tabs to a left sidebar. We keep the ARIA tablist pattern (vertical) so `role="tab"`/`aria-selected` queries stay valid. The sidebar shows the logo, a live connection `StatusDot`, and the five nav items with `lucide-react` icons. The main area animates between screens with Framer Motion. `ConnectionBar` is still rendered (it gets restyled in Task 5) — for now keep importing and rendering it inside the sidebar.

- [ ] **Step 1: Update the failing test** for the new shell

`src/renderer/src/App.test.tsx` (replace the file):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from './App'

beforeEach(() => {
  ;(globalThis as any).window.api = {
    listProfiles: vi.fn().mockResolvedValue([]),
    discover: vi.fn().mockResolvedValue([]),
    connect: vi.fn().mockResolvedValue(true),
    saveProfile: vi.fn().mockResolvedValue([]),
    startStatusFeed: vi.fn().mockResolvedValue(true),
    onStatusUpdate: vi.fn().mockReturnValue(() => {}),
    onScriptOutput: vi.fn().mockReturnValue(() => {}),
    listScripts: vi.fn().mockResolvedValue([]),
    smbList: vi.fn().mockResolvedValue([])
  }
})

describe('App shell', () => {
  it('renders a vertical tablist with the five screens and the brand', async () => {
    render(<App />)
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
    expect(screen.getByRole('tab', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /control/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /scripts/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /retroachievements/i })).toBeInTheDocument()
    expect(screen.getByAltText(/mister companion/i)).toBeInTheDocument()
  })

  it('switches the active screen on nav click', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /scripts/i }))
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /scripts/i })).toHaveAttribute('aria-selected', 'true')
    )
  })
})
```

- [ ] **Step 2: Run it to verify failure**

Run: `npm run test -- src/renderer/src/App.test.tsx`
Expected: FAIL (no `tablist` with vertical orientation / no logo img yet).

- [ ] **Step 3: Make the logo importable by the renderer bundle**

The renderer (Vite) can import the committed asset. Reference it from `src/renderer/src/components/Sidebar.tsx` via a relative URL import (Step 5 uses `new URL('../../../../assets/logo.png', import.meta.url)`). No file move needed — Vite resolves it at build time.

- [ ] **Step 4: Write `src/renderer/src/components/StatusDot.tsx`**

```tsx
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
```

- [ ] **Step 5: Write `src/renderer/src/components/Sidebar.tsx`**

```tsx
import { Activity, Gamepad2, Terminal, FolderOpen, Trophy } from 'lucide-react'
import { cn } from '../lib/utils'
import { StatusDot } from './StatusDot'
import { ConnectionBar } from '../ConnectionBar'
import { useStatus } from '../hooks/useStatus'

const logoUrl = new URL('../../../../assets/logo.png', import.meta.url).href

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const NAV: NavItem[] = [
  { id: 'status', label: 'Status', icon: Activity },
  { id: 'control', label: 'Control', icon: Gamepad2 },
  { id: 'scripts', label: 'Scripts', icon: Terminal },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'ra', label: 'RetroAchievements', icon: Trophy }
]

export function Sidebar({
  active,
  onSelect
}: {
  active: string
  onSelect: (id: string) => void
}): JSX.Element {
  const status = useStatus()
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-4 border-r border-border bg-card/40 p-4 backdrop-blur">
      <div className="flex items-center gap-3 px-1">
        <img src={logoUrl} alt="MiSTer Companion" className="size-10 rounded-md" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">MiSTer Companion</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <StatusDot online={status.online} />
            {status.online ? 'Connected' : 'Offline'}
          </div>
        </div>
      </div>

      <nav role="tablist" aria-orientation="vertical" className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon
          const selected = active === item.id
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
                selected
                  ? 'bg-primary/15 text-primary shadow-glow'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto">
        <ConnectionBar localIp={window.location.hostname || '192.168.1.10'} />
      </div>
    </aside>
  )
}
```

- [ ] **Step 6: Rewrite `src/renderer/src/App.tsx`** as the sidebar shell

```tsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster } from './components/ui/sonner'
import { Sidebar, NAV } from './components/Sidebar'
import { StatusTab } from './tabs/StatusTab'
import { ControlTab } from './tabs/ControlTab'
import { ScriptsTab } from './tabs/ScriptsTab'
import { FilesTab } from './tabs/FilesTab'
import { RATab } from './tabs/RATab'

const SCREENS: Record<string, JSX.Element> = {
  status: <StatusTab />,
  control: <ControlTab />,
  scripts: <ScriptsTab />,
  files: <FilesTab />,
  ra: <RATab />
}

export function App(): JSX.Element {
  const [active, setActive] = useState<string>('status')
  const label = NAV.find((n) => n.id === active)?.label ?? ''
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar active={active} onSelect={setActive} />
        <main role="tabpanel" aria-label={label} className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {SCREENS[active]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
```

- [ ] **Step 7: Run the shell test, then the full suite**

Run: `npm run test -- src/renderer/src/App.test.tsx`
Expected: PASS (2 tests).
Run: `npm run test`
Expected: all suites green. (Existing tab tests still pass — the tabs themselves are unchanged until later tasks; they're rendered inside the new shell.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): sidebar shell with live status, lucide nav, and motion routing"
```

---

### Task 5: Connection panel redesign (discover + saved profiles + toasts)

**Files:**
- Modify: `src/renderer/src/ConnectionBar.tsx`
- Test: `src/renderer/src/ConnectionBar.test.tsx`

**Context:** Restyle the connection bar to live at the bottom of the sidebar: a compact card with a Discover button, a list of discovered devices, saved-profile quick-connect, an error line, and a success **toast** on connect. Behavior (calls `api.discover`, `api.connect`, `api.listProfiles`) is unchanged — only presentation + the toast. The existing test asserts discover→list→connect and saved-profile quick-connect; keep those assertions, add a toast-on-connect expectation via a `sonner` spy.

- [ ] **Step 1: Update the test**

`src/renderer/src/ConnectionBar.test.tsx` (replace the file):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConnectionBar } from './ConnectionBar'

const connect = vi.fn().mockResolvedValue(true)
const discover = vi.fn().mockResolvedValue([{ host: '192.168.31.50', hostname: 'MiSTer', source: 'scan' }])
const toastSuccess = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() }
}))

beforeEach(() => {
  connect.mockClear()
  discover.mockClear()
  toastSuccess.mockClear()
  ;(globalThis as any).window.api = {
    listProfiles: vi.fn().mockResolvedValue([]),
    discover,
    connect,
    saveProfile: vi.fn().mockResolvedValue([])
  }
})

describe('ConnectionBar', () => {
  it('discovers devices and connects to a chosen one, toasting success', async () => {
    render(<ConnectionBar localIp="192.168.31.20" />)
    fireEvent.click(screen.getByRole('button', { name: /discover/i }))
    await waitFor(() => screen.getByText(/192\.168\.31\.50/))
    fireEvent.click(screen.getByText(/192\.168\.31\.50/))
    await waitFor(() => expect(connect).toHaveBeenCalled())
    expect(connect.mock.calls[0][0].host).toBe('192.168.31.50')
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
  })

  it('renders saved profiles and connects on click', async () => {
    ;(window.api as any).listProfiles = vi
      .fn()
      .mockResolvedValue([{ id: 'p1', name: 'Saved', host: '192.168.31.99', restPort: 8182, sshPort: 22 }])
    render(<ConnectionBar localIp="192.168.31.20" />)
    await waitFor(() => screen.getByRole('button', { name: /saved/i }))
    fireEvent.click(screen.getByRole('button', { name: /saved/i }))
    await waitFor(() => expect(connect).toHaveBeenCalledWith(expect.objectContaining({ host: '192.168.31.99' })))
  })
})
```

- [ ] **Step 2: Run it to verify failure**

Run: `npm run test -- src/renderer/src/ConnectionBar.test.tsx`
Expected: FAIL (no `sonner` toast call yet; styling/markup differs).

- [ ] **Step 3: Rewrite `src/renderer/src/ConnectionBar.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Radar, Plug, Loader2 } from 'lucide-react'
import { api } from './api'
import { DiscoveredDevice, MisterProfile } from '@shared/types'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'

export function ConnectionBar({ localIp }: { localIp: string }): JSX.Element {
  const [found, setFound] = useState<DiscoveredDevice[]>([])
  const [profiles, setProfiles] = useState<MisterProfile[]>([])
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listProfiles().then(setProfiles).catch(() => {})
  }, [])

  const discover = async () => {
    setBusy(true)
    try {
      setFound(await api.discover(localIp))
    } finally {
      setBusy(false)
    }
  }

  const connectProfile = async (profile: MisterProfile) => {
    try {
      await api.connect(profile)
      setConnected(profile.host)
      setError(null)
      toast.success(`Connected to ${profile.name}`, { description: profile.host })
    } catch (e) {
      const msg = `Connect failed: ${String(e)}`
      setError(msg)
      toast.error(msg)
    }
  }

  const connectDevice = (d: DiscoveredDevice) =>
    connectProfile({ id: d.host, name: d.hostname ?? d.host, host: d.host, restPort: 8182, sshPort: 22 })

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
      <Button onClick={discover} disabled={busy} size="sm" variant="secondary" className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <Radar />}
        {busy ? 'Scanning…' : 'Discover'}
      </Button>

      {connected && (
        <div className="flex items-center gap-1.5 text-xs text-pink">
          <Plug className="size-3" /> {connected}
        </div>
      )}
      {error && <div className="text-xs text-destructive">{error}</div>}

      {found.length > 0 && (
        <ul className="space-y-1">
          {found.map((d) => (
            <li key={d.host}>
              <button
                onClick={() => connectDevice(d)}
                className="w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                {d.hostname ?? d.host} — {d.host}
              </button>
            </li>
          ))}
        </ul>
      )}

      {profiles.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          <div className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">Saved</div>
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => connectProfile(p)}
              className={cn('w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent')}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the test, then the full suite**

Run: `npm run test -- src/renderer/src/ConnectionBar.test.tsx`
Expected: PASS (2 tests).
Run: `npm run test`
Expected: all suites green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): redesigned connection panel with discovery list, saved profiles, toasts"
```

---

# Phase 3 — Screen redesigns

### Task 6: Status dashboard

**Files:**
- Create: `src/renderer/src/lib/format.ts`
- Create: `src/renderer/src/components/StatCard.tsx`
- Modify: `src/renderer/src/tabs/StatusTab.tsx`
- Test: `src/renderer/src/tabs/StatusTab.test.tsx`

**Context:** The Status screen becomes a dashboard: a hero row showing the running core/game with a live `StatusDot`, metric `StatCard`s, and a disk-usage `Progress` gauge. It still consumes `useStatus()` (unchanged). Preserve the behavioral contract: shows "Offline" initially, then renders the pushed core/game.

- [ ] **Step 1: Update the test**

`src/renderer/src/tabs/StatusTab.test.tsx` (replace the file):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { StatusTab } from './StatusTab'
import { emptyStatus } from '@shared/types'

let pushStatus: (s: any) => void = () => {}

beforeEach(() => {
  ;(globalThis as any).window.api = {
    startStatusFeed: vi.fn().mockResolvedValue(true),
    onStatusUpdate: (cb: (s: any) => void) => {
      pushStatus = cb
      return () => {}
    }
  }
})

describe('StatusTab dashboard', () => {
  it('shows Offline first, then live core/game and disk usage', async () => {
    render(<StatusTab />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
    await act(async () => {
      pushStatus({
        ...emptyStatus(),
        online: true,
        core: 'SNES',
        game: 'Chrono Trigger',
        diskTotal: 32_000_000_000,
        diskUsed: 24_000_000_000,
        diskFree: 8_000_000_000
      })
    })
    expect(screen.getByText('SNES')).toBeInTheDocument()
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument()
    expect(screen.getByText(/24\.0 GB/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify failure**

Run: `npm run test -- src/renderer/src/tabs/StatusTab.test.tsx`
Expected: FAIL (no progressbar / disk text yet in new markup).

- [ ] **Step 3: Write `src/renderer/src/lib/format.ts`**

```ts
export function gb(bytes: number | null): string {
  return bytes === null ? '—' : `${(bytes / 1e9).toFixed(1)} GB`
}

export function diskPercent(used: number | null, total: number | null): number {
  if (!used || !total || total <= 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}
```

- [ ] **Step 4: Write `src/renderer/src/components/StatCard.tsx`**

```tsx
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
```

- [ ] **Step 5: Write `src/renderer/src/tabs/StatusTab.tsx`**

```tsx
import { Cpu, Gamepad2, Server, Network, HardDrive } from 'lucide-react'
import { useStatus } from '../hooks/useStatus'
import { StatCard } from '../components/StatCard'
import { StatusDot } from '../components/StatusDot'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { gb, diskPercent } from '../lib/format'

export function StatusTab(): JSX.Element {
  const s = useStatus()
  const pct = diskPercent(s.diskUsed, s.diskTotal)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Status</h1>
          <p className="text-sm text-muted-foreground">Live view of your MiSTer</p>
        </div>
        <Badge variant={s.online ? 'pink' : 'muted'} className="gap-2">
          <StatusDot online={s.online} />
          {s.online ? 'Online' : 'Offline'}
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-x-10 gap-y-3 p-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Core</div>
            <div className="font-mono text-3xl font-bold text-primary">{s.core ?? '—'}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Now playing</div>
            <div className="truncate text-xl font-semibold">{s.game ?? '—'}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Server} label="System" value={s.system ?? '—'} />
        <StatCard icon={Cpu} label="Version" value={s.version ?? '—'} accent="pink" />
        <StatCard icon={Network} label="IP" value={s.ip ?? '—'} />
        <StatCard icon={Gamepad2} label="Hostname" value={s.hostname ?? '—'} accent="pink" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="size-4 text-primary" /> Disk
          </CardTitle>
          <span className="font-mono text-sm text-muted-foreground">
            {gb(s.diskUsed)} / {gb(s.diskTotal)}
          </span>
        </CardHeader>
        <CardContent>
          <Progress value={pct} indicatorClassName={pct > 90 ? 'bg-destructive' : 'bg-primary'} />
          <div className="mt-2 text-right text-xs text-muted-foreground">{pct}% used</div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Run the test, then full suite**

Run: `npm run test -- src/renderer/src/tabs/StatusTab.test.tsx`
Expected: PASS.
Run: `npm run test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): rich Status dashboard with metric cards and disk gauge"
```

---

### Task 7: Control screen (launch + reboot with confirm)

**Files:**
- Modify: `src/renderer/src/tabs/ControlTab.tsx`
- Test: `src/renderer/src/tabs/ControlTab.test.tsx`

**Context:** Launch a game by path (input + Launch button, disabled when empty) and reboot behind a confirm **Dialog** (destructive action) with a success toast. Preserve: `api.launchGame(exactPath)`, `api.reboot()`.

- [ ] **Step 1: Update the test**

`src/renderer/src/tabs/ControlTab.test.tsx` (replace the file):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ControlTab } from './ControlTab'

const launchGame = vi.fn().mockResolvedValue(undefined)
const reboot = vi.fn().mockResolvedValue(undefined)

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  launchGame.mockClear()
  reboot.mockClear()
  ;(globalThis as any).window.api = { launchGame, reboot }
})

describe('ControlTab', () => {
  it('launches the typed game path', () => {
    render(<ControlTab />)
    fireEvent.change(screen.getByPlaceholderText(/path to game/i), {
      target: { value: '/media/fat/games/SNES/Zelda.sfc' }
    })
    fireEvent.click(screen.getByRole('button', { name: /^launch$/i }))
    expect(launchGame).toHaveBeenCalledWith('/media/fat/games/SNES/Zelda.sfc')
  })

  it('reboots only after confirming in the dialog', async () => {
    render(<ControlTab />)
    fireEvent.click(screen.getByRole('button', { name: /reboot/i }))
    const confirm = await screen.findByRole('button', { name: /confirm reboot/i })
    expect(reboot).not.toHaveBeenCalled()
    fireEvent.click(confirm)
    await waitFor(() => expect(reboot).toHaveBeenCalledTimes(1))
  })
})
```

- [ ] **Step 2: Run it to verify failure**

Run: `npm run test -- src/renderer/src/tabs/ControlTab.test.tsx`
Expected: FAIL (no confirm dialog yet).

- [ ] **Step 3: Write `src/renderer/src/tabs/ControlTab.tsx`**

```tsx
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
            <Play /> Launch
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
```

- [ ] **Step 4: Run the test, then full suite**

Run: `npm run test -- src/renderer/src/tabs/ControlTab.test.tsx`
Expected: PASS (2 tests).
Run: `npm run test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): Control screen with launch card and confirm-reboot dialog"
```

---

### Task 8: Scripts screen (cards + terminal output)

**Files:**
- Modify: `src/renderer/src/tabs/ScriptsTab.tsx`
- Test: `src/renderer/src/tabs/ScriptsTab.test.tsx`

**Context:** Grid of script cards (each with a Run button), plus a terminal-style output panel that streams `api.onScriptOutput` chunks. Preserve: loads `api.listScripts()`, clicking a script clears output then `api.runScript(id)`, streamed chunks appear.

- [ ] **Step 1: Update the test**

`src/renderer/src/tabs/ScriptsTab.test.tsx` (replace the file):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ScriptsTab } from './ScriptsTab'

const runScript = vi.fn().mockResolvedValue({ code: 0 })
let pushOutput: (o: any) => void = () => {}

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  runScript.mockClear()
  ;(globalThis as any).window.api = {
    listScripts: vi.fn().mockResolvedValue([
      { id: 'update_all', label: 'Update All', description: 'Run the update_all script', command: 'c' }
    ]),
    runScript,
    onScriptOutput: (cb: (o: any) => void) => {
      pushOutput = cb
      return () => {}
    }
  }
})

describe('ScriptsTab', () => {
  it('lists scripts, runs one, and streams output', async () => {
    render(<ScriptsTab />)
    await waitFor(() => screen.getByRole('button', { name: /run update all/i }))
    fireEvent.click(screen.getByRole('button', { name: /run update all/i }))
    expect(runScript).toHaveBeenCalledWith('update_all')
    await act(async () => pushOutput({ id: 'update_all', chunk: 'working...' }))
    expect(screen.getByText(/working\.\.\./)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify failure**

Run: `npm run test -- src/renderer/src/tabs/ScriptsTab.test.tsx`
Expected: FAIL (button accessible name now "Run update all").

- [ ] **Step 3: Write `src/renderer/src/tabs/ScriptsTab.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Play, TerminalSquare } from 'lucide-react'
import { api } from '../api'
import { ScriptDef } from '@shared/types'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'

export function ScriptsTab(): JSX.Element {
  const [scripts, setScripts] = useState<ScriptDef[]>([])
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.listScripts().then(setScripts)
    const unsub = api.onScriptOutput((o) => setOutput((prev) => prev + o.chunk))
    return unsub
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output])

  const run = (s: ScriptDef) => {
    setOutput('')
    setRunning(s.id)
    api.runScript(s.id).finally(() => setRunning(null))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scripts</h1>
        <p className="text-sm text-muted-foreground">Run MiSTer system scripts over SSH</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scripts.map((s) => (
          <Card key={s.id} className="transition-shadow hover:shadow-glow">
            <CardContent className="flex h-full flex-col gap-3 p-4">
              <div className="font-medium">{s.label}</div>
              <div className="flex-1 text-xs text-muted-foreground">{s.description}</div>
              <Button size="sm" variant="secondary" onClick={() => run(s)} disabled={running !== null}>
                <Play /> Run {s.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <TerminalSquare className="size-4" /> Output
          </div>
          <ScrollArea className="h-64">
            <pre className="whitespace-pre-wrap p-4 font-mono text-xs text-foreground/90">
              {output || 'No output yet — run a script to see live logs.'}
              <div ref={endRef} />
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Run the test, then full suite**

Run: `npm run test -- src/renderer/src/tabs/ScriptsTab.test.tsx`
Expected: PASS.
Run: `npm run test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): Scripts screen with script cards and live terminal output"
```

---

### Task 9: Files screen (breadcrumb + browser)

**Files:**
- Modify: `src/renderer/src/tabs/FilesTab.tsx`
- Test: `src/renderer/src/tabs/FilesTab.test.tsx`

**Context:** SMB browser with a breadcrumb path bar, an Up button, dir/file rows with icons, and loading/empty/error states. Preserve: lists root on mount via `api.smbList('sdcard', '')`, clicking a directory navigates with `api.smbList('sdcard', 'games')`.

- [ ] **Step 1: Update the test**

`src/renderer/src/tabs/FilesTab.test.tsx` (replace the file):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FilesTab } from './FilesTab'

const smbList = vi.fn()

beforeEach(() => {
  smbList.mockReset()
  smbList.mockResolvedValueOnce([
    { name: 'games', isDirectory: true, size: 0 },
    { name: 'MiSTer.ini', isDirectory: false, size: 2048 }
  ])
  ;(globalThis as any).window.api = { smbList }
})

describe('FilesTab', () => {
  it('lists the root on mount and navigates into a directory on click', async () => {
    render(<FilesTab />)
    await waitFor(() => screen.getByText('games'))
    expect(smbList).toHaveBeenCalledWith('sdcard', '')
    smbList.mockResolvedValueOnce([{ name: 'SNES', isDirectory: true, size: 0 }])
    fireEvent.click(screen.getByText('games'))
    await waitFor(() => expect(smbList).toHaveBeenCalledWith('sdcard', 'games'))
  })
})
```

- [ ] **Step 2: Run it to verify failure**

Run: `npm run test -- src/renderer/src/tabs/FilesTab.test.tsx`
Expected: FAIL (markup differs; name still queryable but component not rebuilt).

- [ ] **Step 3: Write `src/renderer/src/tabs/FilesTab.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { ArrowUp, Folder, File as FileIcon, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '../api'
import { SmbEntry } from '@shared/types'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'
import { gb } from '../lib/format'

const SHARE = 'sdcard'

export function FilesTab(): JSX.Element {
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<SmbEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback((p: string) => {
    setLoading(true)
    api
      .smbList(SHARE, p)
      .then((e) => {
        setEntries(e)
        setError(null)
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(path)
  }, [path, load])

  const open = (entry: SmbEntry) => {
    if (entry.isDirectory) setPath(path ? `${path}/${entry.name}` : entry.name)
  }
  const up = () => setPath(path.split('/').slice(0, -1).join('/'))
  const crumbs = path ? path.split('/') : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Files</h1>
        <p className="text-sm text-muted-foreground">Browse the SD card over SMB</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Button size="icon" variant="ghost" onClick={up} disabled={!path} aria-label="Up">
            <ArrowUp />
          </Button>
          <div className="flex items-center gap-1 font-mono text-sm text-muted-foreground">
            <span>/{SHARE}</span>
            {crumbs.map((c, i) => (
              <span key={i}>/{c}</span>
            ))}
          </div>
          {loading && <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />}
        </div>

        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-2 p-6 text-sm text-destructive">
              <AlertTriangle className="size-4" /> {error}
            </div>
          ) : entries.length === 0 && !loading ? (
            <div className="p-6 text-sm text-muted-foreground">Empty folder.</div>
          ) : (
            <ScrollArea className="h-[26rem]">
              <ul className="divide-y divide-border">
                {entries.map((e) => (
                  <li key={e.name}>
                    <button
                      onClick={() => open(e)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent"
                    >
                      {e.isDirectory ? (
                        <Folder className="size-4 text-primary" />
                      ) : (
                        <FileIcon className="size-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate">{e.name}</span>
                      {!e.isDirectory && (
                        <span className="font-mono text-xs text-muted-foreground">{gb(e.size)}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Run the test, then full suite**

Run: `npm run test -- src/renderer/src/tabs/FilesTab.test.tsx`
Expected: PASS.
Run: `npm run test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): Files screen with breadcrumb browser and loading/empty/error states"
```

---

### Task 10: RetroAchievements screen

**Files:**
- Modify: `src/renderer/src/tabs/RATab.tsx`
- Test: `src/renderer/src/tabs/RATab.test.tsx`

**Context:** Credentials card (username + API key, Load disabled until both filled), a points/rank hero, and a grid of recent games with `Progress` bars. Preserve: `api.raSummary('hudson','key')` called; points (1234) and a game title (Sonic) render.

- [ ] **Step 1: Update the test**

`src/renderer/src/tabs/RATab.test.tsx` (replace the file):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RATab } from './RATab'

const raSummary = vi.fn().mockResolvedValue({
  hardcorePoints: 1234,
  softcorePoints: 50,
  rank: 42,
  totalRanked: 100000,
  currentGame: null,
  recentGames: [
    { gameId: 1, title: 'Sonic', console: 'Genesis', numAchieved: 5, numPossible: 50, percent: 10, iconUrl: null }
  ]
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  raSummary.mockClear()
  ;(globalThis as any).window.api = { raSummary }
})

describe('RATab', () => {
  it('fetches and renders the RA summary after entering credentials', async () => {
    render(<RATab />)
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'hudson' } })
    fireEvent.change(screen.getByPlaceholderText(/api key/i), { target: { value: 'key' } })
    fireEvent.click(screen.getByRole('button', { name: /load/i }))
    expect(raSummary).toHaveBeenCalledWith('hudson', 'key')
    await waitFor(() => screen.getByText(/1234/))
    expect(screen.getByText('Sonic')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify failure**

Run: `npm run test -- src/renderer/src/tabs/RATab.test.tsx`
Expected: FAIL (markup not rebuilt).

- [ ] **Step 3: Write `src/renderer/src/tabs/RATab.tsx`**

```tsx
import { useState } from 'react'
import { toast } from 'sonner'
import { Trophy, Medal } from 'lucide-react'
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

  const load = () => {
    setLoading(true)
    api
      .raSummary(username, apiKey)
      .then((s) => setSummary(s))
      .catch((e) => toast.error(`RetroAchievements: ${String(e)}`))
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">RetroAchievements</h1>
        <p className="text-sm text-muted-foreground">Track your hardcore progress</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credentials</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            className="w-48"
            placeholder="RA Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            className="w-48"
            type="password"
            placeholder="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <Button onClick={load} disabled={!username || !apiKey || loading}>
            {loading ? 'Loading…' : 'Load'}
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
                  <div className="text-xs uppercase text-muted-foreground">Hardcore points</div>
                  <div className="font-mono text-2xl font-bold">{summary.hardcorePoints}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <Medal className="size-7 text-primary" />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Rank</div>
                  <div className="font-mono text-2xl font-bold">#{summary.rank}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Softcore</div>
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
```

- [ ] **Step 4: Run the test, then full suite**

Run: `npm run test -- src/renderer/src/tabs/RATab.test.tsx`
Expected: PASS.
Run: `npm run test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): RetroAchievements screen with points hero and game progress grid"
```

---

# Phase 4 — Polish & ship

### Task 11: Final pass — lint, build, full verification

**Files:**
- Modify: `.eslintrc.cjs` (only if new globs/rules are needed)
- Verify only (no new product code unless lint requires fixes)

- [ ] **Step 1: Lint the new code**

Run: `npm run lint`
Expected: clean. If ESLint flags real issues in the new components (unused imports, etc.), fix them properly in the offending file. The lint scope is `.ts,.tsx`; the shadcn primitives and screens must pass. Do **not** disable meaningful rules to hide problems — fix the code. (`@typescript-eslint/no-explicit-any` is already off, which covers the `as any` test casts.)

- [ ] **Step 2: Full test suite**

Run: `npm run test`
Expected: all suites green (button smoke test + all rebuilt screen tests + shell + connection).

- [ ] **Step 3: Production renderer build**

Run: `npm run build`
Expected: `electron-vite build` succeeds; Tailwind purges to a small CSS bundle; no type errors.

- [ ] **Step 4: Smoke-run the app (manual, optional)**

Run: `npm run dev`
Expected (manual): the app opens with the sidebar, cat logo, dark-cyber theme; navigating animates between screens; Discover/connect, launch, scripts output, file browse, and RA all render. Close when satisfied. If no display is available, skip and rely on the test suite + build.

- [ ] **Step 5: Commit any lint fixes**

```bash
git add -A
git commit -m "chore(ui): lint fixes and final redesign verification"
```
(If Steps 1–4 produced no changes, skip this commit.)

---

### Task 12: Version bump + release

**Files:**
- Modify: `package.json` (version)

- [ ] **Step 1: Bump the version to `0.2.0`** (minor — new UI)

In `package.json` change `"version": "0.1.1"` to `"version": "0.2.0"`, then sync the lockfile:
```bash
npm install --package-lock-only
```

- [ ] **Step 2: Commit the bump**

```bash
git add -A
git commit -m "chore: bump to 0.2.0 (UI redesign)"
git push origin main
```

- [ ] **Step 3: Cut the release tag** ⚠️ outward-facing — confirm with the user before running

This triggers the CI release pipeline (builds + publishes installers for the 3 OS to a GitHub Release). Only run after the user approves cutting `v0.2.0`:
```bash
git tag -a v0.2.0 -m "v0.2.0 — full UI redesign (sidebar, dark-cyber theme, shadcn/ui)"
git push origin v0.2.0
```
Then watch:
```bash
gh run watch "$(gh run list --event push --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
gh release view v0.2.0 --json isDraft,assets --jq '{draft:.isDraft, assets:[.assets[].name]}'
```
Expected: all jobs succeed; release `v0.2.0` published with `.dmg`/`.exe`/`.AppImage` + `latest-*.yml`.

---

## Self-Review

**Spec coverage:**
- "Redesenhar completamente a interface" → Phases 0–3 rebuild the design system (Tasks 1–2), shell (Task 4), connection (Task 5), and all five screens (Tasks 6–10). ✅
- "Telas ricas, focadas em UX" → dashboard cards/gauges (Task 6), confirm dialogs (Task 7), terminal panel (Task 8), breadcrumb browser with states (Task 9), points hero + progress grid (Task 10). ✅
- "Bastante interativas e modernas" → Tailwind + shadcn/Radix (Task 2), Framer Motion transitions/hover/pulse (Tasks 4, 6), toasts (Tasks 5, 7, 10). ✅
- "Use essa imagem como ícone" → `build/icon.png` + electron-builder per-platform icon + window icon (Task 3). ✅
- "Adicione ela no README" → centered hero block (Task 3 Step 4). ✅

**Placeholder scan:** Every code step includes full file contents. The shadcn primitives are complete (not "add a Button component"). Test code is shown in full. No "similar to Task N". ✅

**Type/name consistency:**
- `cn` defined in `lib/utils.ts` (Task 2), imported by every UI primitive and component with correct relative depth (`../../lib/utils` from `components/ui/*`, `../lib/utils` from `components/*`). ✅
- `NAV` exported from `Sidebar.tsx` (Task 4) and consumed by `App.tsx` (Task 4) for the active label. ✅
- `Progress` accepts `value` + `indicatorClassName` (Task 2) — used by `StatusTab` (Task 6) and `RATab` (Task 10) with those exact props. ✅
- `gb()` moves to `lib/format.ts` (Task 6) and is imported by `StatusTab` (Task 6) and `FilesTab` (Task 9) — both reference `gb`. `diskPercent` defined in the same file, used by `StatusTab`. ✅
- `StatusDot({ online })` (Task 4) consumed by `Sidebar` (Task 4) and `StatusTab` (Task 6) with the `online` prop. ✅
- `useStatus()` and `api` are untouched; screens import them unchanged. ✅
- Behavioral test contracts preserved: `api.launchGame(path)`, `api.reboot()`, `api.runScript(id)`, `api.smbList('sdcard', path)`, `api.raSummary(u, k)`, `api.discover`/`connect`/`listProfiles` — each rebuilt screen's test still asserts the same call. Sidebar keeps `role="tablist"`/`role="tab"`/`aria-selected`. ✅

**Risk notes:**
- `sonner` is mocked in tests that assert toasts to avoid rendering the real toaster portal in jsdom; the real `<Toaster/>` is mounted only in `App` (untested for toast output). Polyfills (Task 2) cover Radix/sonner jsdom needs.
- Framer Motion renders plain DOM in jsdom (no animation), so queries are unaffected; `AnimatePresence mode="wait"` keys on `active` and does not duplicate panels in assertions because only one screen renders at a time.
