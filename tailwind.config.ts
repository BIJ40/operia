import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      maxWidth: {
        app: '1600px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Typography scale
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        // Consistent spacing scale
        '4.5': '1.125rem',
        '18': '4.5rem',
      },
      gridTemplateColumns: {
        '20': 'repeat(20, minmax(0, 1fr))',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        cyan: {
          DEFAULT: "hsl(var(--cyan))",
          foreground: "hsl(var(--cyan-foreground))",
        },
        // HelpConfort brand colors
        helpconfort: {
          blue: {
            DEFAULT: "hsl(var(--hc-blue))",
            light: "hsl(var(--hc-blue-light))",
            lighter: "hsl(var(--hc-blue-lighter))",
            dark: "hsl(var(--hc-blue-dark))",
            main: "hsl(var(--hc-blue))",
          },
          orange: {
            DEFAULT: "hsl(var(--hc-orange))",
            light: "hsl(var(--hc-orange-light))",
          },
          gray: {
            DEFAULT: "hsl(var(--hc-gray))",
            dark: "hsl(var(--hc-gray-dark))",
          },
        },
        // Warm Dashboard palette
        warm: {
          blue: "hsl(var(--warm-blue))",
          green: "hsl(var(--warm-green))",
          orange: "hsl(var(--warm-orange))",
          purple: "hsl(var(--warm-purple))",
          pink: "hsl(var(--warm-pink))",
          teal: "hsl(var(--warm-teal))",
          cyan: "hsl(var(--warm-cyan))",
          red: "hsl(var(--warm-red))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'warm': 'var(--shadow-card)',
        'warm-hover': 'var(--shadow-card-hover)',
        'warm-lg': '0 10px 40px -10px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'warm': 'var(--radius-warm)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(4px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "pulse-red": {
          "0%, 100%": {
            backgroundColor: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
          },
          "50%": {
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderColor: "rgba(239, 68, 68, 0.6)",
          },
        },
        "pulse-yellow": {
          "0%, 100%": {
            backgroundColor: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
          },
          "50%": {
            backgroundColor: "rgba(234, 179, 8, 0.15)",
            borderColor: "rgba(234, 179, 8, 0.6)",
          },
        },
        "pulse-progress": {
          "0%, 100%": {
            opacity: "1",
            transform: "scaleX(1)",
          },
          "50%": {
            opacity: "0.7",
            transform: "scaleX(1.02)",
          },
        },
        "bounce-subtle": {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-3px)",
          },
        },
        "heartbeat": {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "14%": {
            transform: "scale(1.15)",
          },
          "28%": {
            transform: "scale(1)",
          },
          "42%": {
            transform: "scale(1.15)",
          },
          "70%": {
            transform: "scale(1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "spin-slow": "spin-slow 3s linear infinite",
        "pulse-red": "pulse-red 1.5s ease-in-out infinite",
        "pulse-yellow": "pulse-yellow 1.5s ease-in-out infinite",
        "pulse-progress": "pulse-progress 1s ease-in-out",
        "bounce-subtle": "bounce-subtle 0.4s ease-in-out",
        "heartbeat": "heartbeat 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;