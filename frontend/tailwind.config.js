module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  // theme: {
  //   container: {
  //     screens: {
  //       sm: '640px',
  //       md: '768px',
  //       lg: '1024px',
  //       xl: '1024px',
  //       '2xl': '1536px',
  //     },
  //   }
  // },
  plugins: [
    require('@tailwindcss/forms'),
    // ...
  ],
}
