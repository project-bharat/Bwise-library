/** Same palette / fonts as the original Index.html Tailwind CDN config. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#1E3535',
        moss: '#868d7d',
        ochre: '#047372',
        sage: '#7B8C7D',
        sand: '#D4C1A3',
        alabaster: '#F4F1EA',
        charcoal: '#0F1E1E'
      },
      fontFamily: { sans: ['"Mukta"', '"Noto Sans Devanagari"', 'sans-serif'] },
      boxShadow: {
        'solid-dark': '0 10px 25px -5px rgba(15, 30, 30, 0.4), 0 8px 10px -6px rgba(15, 30, 30, 0.4)'
      }
    }
  },
  plugins: []
};
