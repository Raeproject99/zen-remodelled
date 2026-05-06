# SCSS Sources

Edit these files first, then run:

```sh
npm run build:scss
```

The compiled CSS is written back to `chrome/`, which is what `theme.json`,
`userChrome.css`, and `userContent.css` load.

The source is organized by the element being styled. For example, URL bar rules
belong in `browser/urlbar.scss`, including URL bar rules that only apply inside
compact mode.

`browser/combined.scss` is an audit scratch file and is not compiled by the build
script.
