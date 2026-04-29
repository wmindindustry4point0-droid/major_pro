/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    // BUG 16 FIX: Safelist dynamic color classes used in getScoreColor().
    // Tailwind's JIT purger cannot detect classes built via string interpolation
    // (e.g. `text-${c}-400`) so they must be explicitly listed here.
    safelist: [
        'text-emerald-400', 'text-yellow-400', 'text-rose-400',
        'bg-emerald-500',   'bg-yellow-500',   'bg-rose-500',
        'border-emerald-500/20', 'border-yellow-500/20', 'border-rose-500/20',
        'bg-emerald-500/10',     'bg-yellow-500/10',     'bg-rose-500/10',
    ],
    theme: {
        extend: {
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out forwards',
            },
            screens: {
                'xs': '480px',
            },
        },
    },
    plugins: [],
}