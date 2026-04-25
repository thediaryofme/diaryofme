My website is inspired heavily by Incerto by Nassim Nicholas Taleb: I highly recommend you read it. 

I borrow several of his concepts when deciding how to make this site:

Antifragility: Even if the global OAuth system collapses, my website remains intact; local storage and possibly Arweave continue to work as access points. My signature authentication scheme increases in value if OAuth is destroyed; all you need is a simple camera that reads QR codes. 

Skin in the game: This site is made by myself for myself, as a diy project. While it is free and open source for anyone to use and possibly audit, I only expect myself to use it. The security of my journal, and by extension my digital self, is solely dependent on the correctness of my implementation.

Via Negativa: a lot of bloat and security risks can be eliminated by simply removing what you know is fragile rather than adding new things. For example, side-channel attacks become impractical if there is simply no server, allowing me to use UOV QR codes with impunity. Similarly, dependency rot is impossible if you just avoid all frameworks and vendor WASM modules for cryptographic security. Next, random domain collapse is impossible if you simply remove the backend code and use a service worker/Arweave for backups. Additionally, random key leaks are almost impossible if you remove RNGs entirely, preferring a hedged model where you input the seed instead. Similarly, by eschewing Tailwind and using only 1 font and 4 colors, you can avoid bloated CSS and keep the minified full site to ~500 kB.

Lindy Effect: while an algorithm can be new, everything is built using W3C protected materials: WASM 2019 standard, HTML, CSS, JS, SVG, etc. As they have survived for years to decades, they are more likely to survive that long in the future.

Barbell Strategy: this journal is my long lasting personal sanctuary, while my presence on public platforms is high risk (due to platform collapse or ban) but also offers the unbounded upside of public interaction.
## Adding a static page

1. Create `<name>/index.html` <-€<- plain HTML, no JS required.
2. In `service-worker.js`, add two entries to `SHELL_PAGE_URLS`:
   ```
   "./<name>/",
   "./<name>/index.html",
   ```
3. Bump `CACHE_NAME` version (e.g. `v1` <-<-<- `v2`) so existing users pick up the new cache.
4. Link to the page from wherever makes sense (e.g. `index.html`, the about page, etc.).

That's it. No build step, no framework, no config files. If the page has no JS at all, steps 2<-€“3 are only needed for offline support.