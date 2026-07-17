import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens de categoría (se leen como var CSS en globals.css)
        work: 'rgb(var(--cat-work) / <alpha-value>)',
        gym: 'rgb(var(--cat-gym) / <alpha-value>)',
        delivery: 'rgb(var(--cat-delivery) / <alpha-value>)',
        rest: 'rgb(var(--cat-rest) / <alpha-value>)',
        personal: 'rgb(var(--cat-personal) / <alpha-value>)',
        goal: 'rgb(var(--cat-goal) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
export default config;
