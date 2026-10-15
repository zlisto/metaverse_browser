# Metaverse Browser

**Try it:** https://zlisto.github.io/metaverse_browser/

The "me" browser for the Metaverse Web. It shows one world at a time, carries your name between worlds, keeps Back and Forward history, and follows the portals you walk through. It speaks `mvw/0.1`; the spec is in `https://github.com/zlisto/metaverse_web/blob/main/PROTOCOL.md`.

## Run everything locally

Start the two worlds and the browser, each in its own terminal:

```bash
npm --prefix darul_kebab run dev
npm --prefix metaverse_browser run dev
```

Then open http://localhost:5175. Run `npm install` in each folder first if you haven't.

## Using it

- **Address bar:** type a world's address, optionally with a spawn point, like `localhost:5174/?spawn=front_door`, and press Enter.
- **Bookmarks:** Yale SOM and Darul Kebab.
- **Portals:** walk through the glowing doorway in Yale's west cloister to reach Darul Kebab, and out Darul Kebab's front door to get back to Yale. Back returns you to the portal you took.
- **World info panel:** the world's name and description from its manifest, where you are in it, its portals and its spawn points (click one to jump there).
- **You:** click your name to change it and your color. Worlds you visit get your name; the Darul Kebab owner greets you by it.

## Adding a friend's world

Their world needs a manifest at `/.well-known/metaverse.json`, spawn points chosen with `?spawn=`, and the `mvw.js` client (copy it from `https://github.com/zlisto/darul_kebab/blob/main/src/mvw.js`). Then type its address here, add it to `BOOKMARKS` in `src/App.jsx`, or put a portal to it in one of your worlds. To show its name and portals in the info panel, their server has to allow cross-origin requests for the manifest file.
