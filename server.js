const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const app = express();
const db = new Database('quotes.db');

// Escape a string for safe use inside an HTML attribute or SVG text node.
// Collapses whitespace so newline-heavy quote text doesn't break meta tags.
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

function wrapText(text, charsPerLine) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const word of words) {
        const candidate = cur ? `${cur} ${word}` : word;
        if (candidate.length > charsPerLine && cur) {
            lines.push(cur);
            cur = word;
        } else {
            cur = candidate;
        }
    }
    if (cur) lines.push(cur);
    return lines;
}

async function ogImageBuffer(text) {
    const W = 1200, H = 628, PAD = 40;
    const photoSize = 400;
    const divX = PAD + photoSize + 8;   // 448 — x of vertical accent bar
    const textX = divX + 4 + 20;        // 472 — left edge of text column
    const textW = W - textX - PAD;      // 688 — available text width
    const titleSize = 34, quoteSize = 26, lineH = quoteSize * 1.5;
    const charsPerLine = Math.floor(textW / (quoteSize * 0.56));

    const display = text.length > 500 ? text.slice(0, 497) + '…' : text;
    const lines = wrapText(display, charsPerLine);

    // Vertically centre the quote block in the space below the title
    const quoteAreaTop = 110, quoteAreaH = H - PAD - quoteAreaTop;
    const blockH = lines.length * lineH;
    const firstBaseline = quoteAreaTop + Math.max(0, (quoteAreaH - blockH) / 2) + quoteSize;

    const tspans = lines.map((l, i) =>
        `<tspan x="${textX}" dy="${i === 0 ? 0 : lineH}">${escapeAttr(l)}</tspan>`
    ).join('\n        ');

    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${divX}" y="0" width="4" height="${H}" fill="#d45113"/>
      <text x="${textX}" y="72" font-family="sans-serif" font-size="${titleSize}" font-weight="700" fill="#d45113">Niki says:</text>
      <text x="${textX}" y="${firstBaseline}" font-family="sans-serif" font-size="${quoteSize}" fill="#444444">
        ${tspans}
      </text>
    </svg>`;

    const photo = await sharp(path.join(__dirname, 'public', 'images', 'niki-smug1-web.png'))
        .resize(photoSize, photoSize)
        .toBuffer();

    return sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
        .composite([
            { input: photo, left: PAD, top: Math.floor((H - photoSize) / 2) },
            { input: Buffer.from(svg), left: 0, top: 0 },
        ])
        .png()
        .toBuffer();
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

    const ogImage = id ? `${base}/og-image?id=${encodeURIComponent(id)}` : `${base}/og-image`;

    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8')
        .replaceAll('__OG_DESC__', desc)
        .replace('__OG_URL__', escapeAttr(ogUrl))
        .replace('__OG_IMAGE__', ogImage);

    res.set('Content-Type', 'text/html; charset=UTF-8');
    res.send(html);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

app.get('/og-image', async (req, res) => {
    const id = req.query.id;
    const row = id ? db.prepare('SELECT content AS text FROM quotes WHERE id = ?').get(id) : null;
    const text = row ? row.text : 'Stuff Niki would say...';
    try {
        const buf = await ogImageBuffer(text);
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.send(buf);
    } catch (err) {
        console.error('og-image error:', err);
        res.sendStatus(500);
    }
});

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
