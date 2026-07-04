/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#F3F4F6",  // light gray text
          light: "#E5E7EB",
        },
        teal: {
          DEFAULT: "#7C3AED",  // primary Violet
          dark: "#5B21B6",     // deep Violet
          light: "#A78BFA",    // light Violet
        },
        coral: "#EF4444",      // high risk / alerts
        amber: "#F59E0B",      // moderate risk
        sage: "#10B981",       // low risk / positive
        paper: "#090E1A",      // deep dark blue background
        line: "rgba(99, 102, 241, 0.15)", // semi-transparent hairline borders
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,31,42,0.06), 0 1px 12px rgba(11,31,42,0.05)",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
