/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        crm: {
          dark: '#080C16',
          panel: '#0F172A',
          card: '#131F37',
          border: '#1E293B',
          accent: '#00F0FF',
          violet: '#8B5CF6',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(0, 240, 255, 0.3)',
        'glow-violet': '0 0 20px -5px rgba(139, 92, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
