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

// Declared BEFORE express.static so it owns '/'; all other assets fall through to static.
// Link unfurlers (WhatsApp, Slack, iMessage...) don't run JS, so OG tags are injected server-side.
app.get('/', (req, res) => {
    const base = baseUrl(req);
    const id = req.query.id;
    let desc = 'Stuff Niki would say...';
    let ogUrl = `${base}/`;

    if (id) {
        const row = db.prepare('SELECT content AS text FROM quotes WHERE id = ?').get(id);
        if (row) {
            const full = row.text;
            desc = escapeAttr(full.length > 200 ? full.slice(0, 197) + '...' : full);
            ogUrl = `${base}/?id=${encodeURIComponent(id)}`;
        }
    }

    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8')
        .replaceAll('__OG_DESC__', desc)
        .replace('__OG_URL__', escapeAttr(ogUrl))
        .replace('__OG_IMAGE__', `${base}/images/niki-og.png`);

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