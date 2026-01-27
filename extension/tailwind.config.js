
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--bg-color)",
                foreground: "var(--text-main)",
                muted: "var(--text-muted)",
                primary: "var(--primary)",
                "primary-hover": "var(--primary-hover)",
            }
        },
    },
    plugins: [],
}
