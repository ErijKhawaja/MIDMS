/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:        '#0B1220',
        surface:   '#111827',
        surface2:  '#1a2535',
        border:    '#1e3a5f',
        accent:    '#C8963E',
        accent2:   '#3B82F6',
        text:      '#E8EDF5',
        muted:     '#6B7FA3',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body:    ['"IBM Plex Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      width:  { sidebar: '320px' },
      height: { topbar: '56px', chart: '280px' },
    },
  },
  plugins: [],
}
