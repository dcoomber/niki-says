const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const db = new Database('quotes.db');

// Escape a string for safe use inside an HTML attribute, collapsing whitespace
// (quote text contains newlines, quotes, and & which would break the meta tag).
function escapeAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim();
}

// Absolute base URL for Open Graph tags (crawlers require absolute URLs). Render runs
// behind a proxy, so honour the forwarded headers; PUBLIC_BASE_URL can override entirely.
function baseUrl(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}`;
}

// Homepage. Link unfurlers (WhatsApp, Slack, iMessage, Facebook...) do NOT run JavaScript,
// so the per-quote preview must be baked into the HTML server-side. When ?id= is present we
// inject the quote text into the description/og:description tags before serving index.html.
// Declared BEFORE express.static so it owns '/'; all other assets fall through to static.
app.get('/', (req, res) => {
    let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    const base = baseUrl(req);
    const id = req.query.id;
    let ogUrl = `${base}/`;

    if (id) {
        const row = db.prepare('SELECT content AS text FROM quotes WHERE id = ?').get(id);
        if (row) {
            const full = row.text;
            const desc = escapeAttr(full.length > 200 ? full.slice(0, 197) + '...' : full);
            ogUrl = `${base}/?id=${encodeURIComponent(id)}`;
            html = html
                .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${desc}">`)
                .replace(/<meta property="og:description"[^>]*\/?>/i, `<meta property="og:description" content="${desc}" />`);
        }
    }

    // OG image/url must be absolute for previews to render; rewrite them on every response.
    html = html
        .replace(/<meta property="og:url"[^>]*\/?>/i, `<meta property="og:url" content="${escapeAttr(ogUrl)}" />`)
        .replace(/<meta property="og:image"[^>]*\/?>/i, `<meta property="og:image" content="${base}/images/niki-smug1-preview.png" />`);

    res.set('Content-Type', 'text/html; charset=UTF-8');
    res.send(html);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

app.get('/msg', (req, res) => {
    const stmt = db.prepare('SELECT content AS text FROM quotes WHERE id = ?');
    const row = stmt.get(req.query.id);
    if (row) {
        res.json(row);
    } else {
        res.status(404).json({ error: 'not found' });
    }
});

app.get('/search', (req, res) => {
    const stmt = db.prepare('SELECT id, content AS text FROM quotes WHERE content LIKE ?');
    const rows = stmt.all(`%${req.query.q}%`);
    res.json(rows);
});

app.get('/random', (req, res) => {
    const stmt = db.prepare('SELECT content AS text FROM quotes ORDER BY RANDOM() LIMIT 1');
    const row = stmt.get();
    res.json(row);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});