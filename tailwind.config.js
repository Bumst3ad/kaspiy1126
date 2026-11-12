/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--bg-base)',
        'surface': 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'hairline': 'var(--hairline)',
        'accent': 'var(--accent)',
        'accent-muted': 'var(--accent-muted)',
        'ok': 'var(--ok)',
        'ok-muted': 'var(--ok-muted)',
        'warn': 'var(--warn)',
        'warn-muted': 'var(--warn-muted)',
        'critical': 'var(--critical)',
        'critical-muted': 'var(--critical-muted)',
        'text': 'var(--text)',
        'text-2': 'var(--text-2)',
        'divider': 'var(--divider)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', 'sans-serif'],
        mono: ['"SF Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'panel': '18px',
        'inner': '10px',
      }
    },
  },
  plugins: [],
}
