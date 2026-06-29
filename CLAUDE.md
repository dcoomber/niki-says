# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start the Express server (defaults to port 3000)
node seed.js       # Seed the SQLite database from the quotes array in public/js/javascript.js
```

No test suite is configured (`npm test` exits 1). No build step — plain Node.js.

Set `PORT` env var to override the default port. Set `PUBLIC_BASE_URL` to override the base URL used in Open Graph tags (useful when running behind a proxy).

## Architecture

This is a minimal Express + SQLite app with no framework on the frontend.

**Data flow:** Quotes are stored in `quotes.db` (SQLite via `better-sqlite3`). `seed.js` is a one-time script that parses the `var quotes` array out of `public/js/javascript.js` and inserts rows into `quotes`.

**Server (`server.js`):** Four routes:
- `GET /` — serves `index.html` with server-side OG tag injection. When `?id=` is present, the matching quote is fetched from SQLite and injected into `<meta name="description">` and `<meta property="og:description">` before the HTML is sent. This is required because link-unfurlers (WhatsApp, Slack, iMessage) don't execute JavaScript.
- `GET /msg?id=` — returns `{ text }` for a single quote.
- `GET /search?q=` — returns `[{ id, text }, ...]` via `LIKE` search.
- `GET /random` — returns `{ text }` for a random quote.

**Frontend (`public/js/javascript.js`):** Vanilla JS SPA. On load, reads `?id=` from the URL; if present, fetches `/msg?id=`; otherwise fetches `/random`. Search hits `/search`, renders clickable links, and uses `history.pushState` to update the URL to `/?id=<id>` when a result is clicked (allowing the link to be shared and unfurled).

**Shareable URLs use `/?id=<id>`** — the query param is handled both server-side (OG tags) and client-side (quote display). The og:url and og:image tags in index.html contain placeholder values that are rewritten dynamically on every response in `server.js`.

## Deployment

Deployed to Render at `https://niki-says.onrender.com`. The server respects `x-forwarded-proto` and `x-forwarded-host` headers for correct absolute URL construction behind Render's proxy.
