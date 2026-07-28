# RF Power Design Assistant

## Development

```bash
npm install
npm run dev
```

```bash
npm run build   # type-check + production build to dist/
```

## Using it on your iPhone (same Wi-Fi)

Run the dev server bound to your machine's network interface instead of just
`localhost`:

```bash
npm run dev:lan
```

Vite prints two URLs — use the **Network** one (something like
`http://192.168.1.23:5173/`), not `Local`. On your iPhone:

1. Connect to the **same Wi-Fi network** as the computer running the server.
2. Open Safari and go to that Network URL.
3. Optional: tap the Share icon → **Add to Home Screen** for a full-screen,
   app-like shortcut (it still needs the dev server running on your computer
   to load).

If the iPhone can't reach it, your computer's firewall is likely blocking
the port (5173 by default) — allow incoming connections for `node`/`vite` on
your local network and try again. `npm run preview -- --host` after
`npm run build` works the same way if you want to test the production build
instead of the dev server.
