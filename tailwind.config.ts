import type { Config } from 'tailwindcss'

export default {
  content: ["app/**/*.{js,tsx,ts,tsx}"],
  mode: "jit",
    theme: {
        extend: {
            spacing: {
                large: "4rem",
                small: "1.5rem",
            },
            colors: {
                dimBlue: "rgba(9, 151, 124, 0.1)",
            },
            lineHeight: {
                "h1-small": "4.550rem",
                "h1-large": "5.850rem",

                "h2-small": "3.75rem",
                "h2-large": "4.50rem",

                "h3-small": "2.625rem",
                "h3-large": "3rem",

                h4: "1.5rem",

                p: "1.875rem",
            },
            fontSize: {
                "h1-small": "3.25rem",
                "h1-large": "4.5rem",

                "h2-small": "2.5rem",
                "h2-large": "3rem",

                "h3-small": "1.75rem",
                "h3-large": "2rem",

                h4: "1.125rem",

                p: "1rem",
            },
            screens: {
                xs: "480px",
                ss: "620px",
                sm: "768px",
                md: "1060px",
                lg: "1200px",
                xl: "1700px",
            },
            fontFamily: {
                poppins: ["Poppins", "sans-serif"],
            },
            backgroundImage: {
                gridDark:
                    "linear-gradient(to right, rgba(0,0,0,0.2) 2px, transparent 2px), linear-gradient(to bottom, rgba(0,0,0,0.2) 2px, transparent 1px)",
                gridLight:
                    "linear-gradient(to right, rgba(0,0,0,0.05) 2px, transparent 2px), linear-gradient(to bottom, rgba(0,0,0,0.05) 2px, transparent 1px)",
            },
        },
    },
  plugins: [require('daisyui')],
} satisfies Config
