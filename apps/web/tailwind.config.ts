import type { Config } from 'tailwindcss'
import { aiGatewayTailwindTheme } from '../../packages/design-system/src/tailwind-theme'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/design-system/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: aiGatewayTailwindTheme,
  plugins: [],
}

export default config
