# Tel Aviv scenic hero

The homepage scenic masthead is implemented in `layout/_partial/home_hero.ejs` and styled in `source/css/_partial/home_hero.styl`. The illustration is original layered SVG art, not a third-party photograph or a recreation of dutilh.net assets.

In `themes/cactus/_config.yml`:

```yaml
hero_scene:
  enabled: true
  variant: jaffa
  parallax: true
```

- Set `enabled: false` to restore the original homepage header and social section.
- Set `parallax: false` to remove pointer motion.
- Assets live in `source/images/hero/<variant>/` and are independently editable.
- The scenic masthead is **homepage-only**; post templates and other pages keep their original Cactus navigation.
- Reduced-motion preference and coarse-pointer devices disable movement automatically.

Run `npm install && npm run build && npm run server` to preview. Check desktop 1440px, tablet 768px, and mobile 375px before merging. Art direction is a visual prototype and merits review in-browser.

## Rothschild Canopy variant

Change `hero_scene.variant` to `rothschild` and regenerate the site. The alternative scene layers original SVG Bauhaus facades, boulevard perspective, and a leafy ficus canopy. It shares the homepage header, navigation, pointer motion, and accessibility behavior with the Jaffa variant. The default remains `jaffa` intentionally; both can be compared before choosing a winner.
