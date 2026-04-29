import type { Config } from 'tailwindcss'

// tailwind v4 reads its design tokens from src/styles/globals.css via @theme.
// this file exists for editor IntelliSense and to declare the content globs.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config
