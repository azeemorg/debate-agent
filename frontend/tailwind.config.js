/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
        heading: ["'Public Sans'", "'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        cream: '#FCF9EA',
        sage: '#97A87A',
        mint: '#A8BBA3',
        cta: '#FFA239',
        surface: {
          base: '#FCF9EA',
          elevated: '#FFFFFF',
          card: 'rgba(252, 249, 234, 0.9)',
          overlay: 'rgba(151, 168, 122, 0.08)',
        },
        accent: {
          DEFAULT: '#FFA239',
          hover: '#FF8C0A',
          glow: 'rgba(255, 162, 57, 0.35)',
          subtle: 'rgba(255, 162, 57, 0.12)',
        },
      },
      borderColor: {
        DEFAULT: 'rgba(168, 187, 163, 0.3)',
      },
      boxShadow: {
        glow: '0 0 20px rgba(255, 162, 57, 0.35)',
        'glow-lg': '0 0 40px rgba(255, 162, 57, 0.25)',
        'card': '0 1px 3px rgba(151, 168, 122, 0.08), 0 4px 12px rgba(151, 168, 122, 0.04)',
        'card-hover': '0 4px 16px rgba(151, 168, 122, 0.12), 0 8px 32px rgba(151, 168, 122, 0.06)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(255, 162, 57, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(255, 162, 57, 0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
