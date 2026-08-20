import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // 8-point spacing grid — only these eight values exist.
    // Do not add raw pixel values to margin, padding, or gap outside this scale.
    // To add a new step: add it here AND to --space-* in index.css. Once or twice a year, not per-screen.
    spacing: {
      '0': '4px',   // icon-to-label, divider offsets
      '1': '8px',   // tight inline gaps
      '2': '16px',  // card padding sm, between form fields
      '3': '24px',  // card padding md, header-to-content gap
      '4': '32px',  // card padding lg, between related blocks
      '5': '48px',  // between major sections
      '6': '64px',  // hero padding, large section break
      '7': '96px',  // page-level vertical rhythm
    },
    extend: {
      colors: {
        navy: '#0D1B2A',
        surface: '#11202F',
        red: '#E8192C',
      },
      fontFamily: {
        display: ['Expose', 'Anton', 'Archivo', 'system-ui', 'sans-serif'],
        body: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
        mark: ['Chakra Petch', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};

export default config;
