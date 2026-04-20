import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/lib/**/*.{ts,tsx}"],
   theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef9f9',
          100: '#d5f1f1',
          200: '#aee3e3',
          300: '#7fd2d3',
          400: '#3cc6c8', // light teal
          500: '#1fa6a8', // primary teal
          600: '#178487',
          700: '#13696c',
          800: '#104f52',
          900: '#0b383a',
        },
        navy: {
          50:  '#e6ecf2',
          100: '#c0cfdd',
          200: '#97afc6',
          300: '#6e8fb0',
          400: '#4f739d',
          500: '#1b3b5f', // main dark blue
          600: '#183454',
          700: '#142c47',
          800: '#0f2a44', // deep navy
          900: '#0a1a2f', // darkest
        },
        accent: {
          yellow: '#f5b81f',
          orange: '#f28c28',
          cream:  '#f4e6c3',
        }
      }
    }
  },
  plugins: [],
};

export default config;
