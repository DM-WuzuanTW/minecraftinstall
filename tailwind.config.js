/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/ui/**/*.{html,js}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                },
            },
            animation: {
                'spin': 'spin 1s linear infinite',
            },
            fontFamily: {
                sans: ['"Microsoft JhengHei"', '"Segoe UI"', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
