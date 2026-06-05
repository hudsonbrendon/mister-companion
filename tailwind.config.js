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
