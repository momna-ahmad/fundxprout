/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'orange-primary': '#F97316',
        'orange-deep': '#EA6C00',
        'amber-accent': '#FBB040',
        'bg-base': '#0A0A0A',
        'bg-card': '#111111',
        'bg-elevated': '#161616',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        'text-muted': '#606060',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Clash Display', 'DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.5)',
        orange: '0 4px 20px rgba(249,115,22,0.45)',
        'orange-lg': '0 8px 40px rgba(249,115,22,0.35)',
      },
    },
  },
  plugins: [],
};
