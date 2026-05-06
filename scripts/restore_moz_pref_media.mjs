import { readFileSync, writeFileSync } from "node:fs";

const placeholder = "@media (width >= 0px)";
const compactRailQuery =
  '@media -moz-pref("zen.view.compact.hide-tabbar") or -moz-pref("zen.view.use-single-toolbar")';

for (const file of [
  "chrome/browser/urlbar.css",
  "chrome/browser/compact_sidebar_rail.css",
]) {
  const css = readFileSync(file, "utf8");
  writeFileSync(file, css.replaceAll(placeholder, compactRailQuery));
}
