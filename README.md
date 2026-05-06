# Zen Remodelled

Tokyo Night Dark Base24 theme for Zen Browser.

Compact mode's toggled floating sidebar is styled as a short centered rail. For
the cleanest toggle, set `zen.view.compact.animate-sidebar` to `false` in
`about:config`.

## Sine

Install this mod in Sine with:

```text
https://github.com/Raeproject99/zen-remodelled
```

Sine reads `theme.json`, imports `chrome/userChrome.css` and `chrome/userContent.css`, and loads `scripts/urlbar_animations.uc.mjs` in the browser window.

The CSS portion loads normally through Sine. The URL bar close animation uses a userscript, so Sine must allow GitHub-hosted JavaScript mods with `sine.allow-unsafe-js`.
