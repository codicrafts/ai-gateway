export const aiGatewayTailwindTheme = {
  screens: {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  extend: {
    colors: {
      primary: {
        DEFAULT: '#a94b2b',
        hover: '#8f3e23',
      },
      secondary: '#215d59',
      success: '#2d7f54',
      danger: '#a13e2e',
      warning: '#ba7a2a',
      dark: {
        DEFAULT: '#f7efe1',
        darker: '#ecdfc8',
        light: '#fff8ee',
      },
      'text-primary': '#181310',
      'text-secondary': '#6c5b4f',
      border: '#cdb79a',
    },
    fontFamily: {
      sans: ['"Avenir Next"', '"Helvetica Neue"', '"Segoe UI"', 'sans-serif'],
      serif: ['"Iowan Old Style"', '"Palatino Linotype"', '"Book Antiqua"', 'Georgia', 'serif'],
      mono: ['"IBM Plex Mono"', '"SFMono-Regular"', 'Menlo', 'monospace'],
    },
    boxShadow: {
      soft: '0 20px 40px rgba(65, 40, 19, 0.08)',
      glow: '0 18px 44px rgba(169, 75, 43, 0.22)',
    },
    keyframes: {
      blob: {
        '0%': { transform: 'translate(0px, 0px) scale(1)' },
        '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
        '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        '100%': { transform: 'translate(0px, 0px) scale(1)' },
      },
      float: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-20px)' },
      },
      slideUp: {
        '0%': { transform: 'translateY(40px)', opacity: '0' },
        '100%': { transform: 'translateY(0)', opacity: '1' },
      },
    },
    animation: {
      blob: 'blob 7s infinite',
      float: 'float 6s ease-in-out infinite',
      'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    },
  },
};
