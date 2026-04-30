/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#10B981',
          dark: '#059669',
          light: '#34D399',
        },
        background: '#F9FAFB',
        text: {
          DEFAULT: '#111827',
          light: '#6B7280',
          dark: '#1F2937',
        },
        border: '#E5E7EB',
        error: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
      },
      fontSize: {
        h1: '32px',
        h2: '24px',
        h3: '20px',
        h4: '16px',
        body: '14px',
        small: '12px',
      },
      borderRadius: {
        DEFAULT: '12px',
      },
      spacing: {
        'base': '16px',
      },
    },
  },
  plugins: [],
}