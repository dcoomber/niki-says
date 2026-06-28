const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database('quotes.db');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    
    if (req.query.id) {
        const id = parseInt(req.query.id);
        const statement = db.prepare('SELECT content AS text FROM quotes WHERE id = ?');
        const quote = statement.get(id);

        if (quote) {
            let description = quote.text.replace(/\s+/g, ' ').substring(0, 200) + '...';
            description = description
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

            const escapedDescription = `“${description}”`;

            html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${escapedDescription}"`);
            html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${escapedDescription}"`);

            const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
            const host = req.headers['x-forwarded-host'] || req.get('host');
            const base = process.env.PUBLIC_BASE_URL || (proto + '://' + host);

            const ogUrl = `${base}/?id=${id}`;
            const ogImage = `${base}/images/niki-og-banner.png`;
            const twitterImage = ogImage;

            html = html.replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${ogUrl}"`);
            html = html.replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${ogImage}"`);

            const twitterCardHtml = `
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:image" content="${twitterImage}">
                <meta property="og:image:width" content="1200">
                <meta property="og:image:height" content="630">
            `;

            html = html.replace('</head>', `${twitterCardHtml}</head>`);
        }
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

app.use(express.static(path.join(__dirname, 'scripts')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/msg', (req, res) => {
    const id = parseInt(req.query.id);
    const statement = db.prepare('SELECT content AS text FROM quotes WHERE id = ?');
    const quote = statement.get(id);

    if (quote) {
        res.json({ text: quote.text });
    } else {
        res.status(404).json({ error: 'not found' });
    }
});

app.get('/search', (req, res) => {
    const q = req.query.q;
    const statement = db.prepare('SELECT id, content AS text FROM quotes WHERE content LIKE ?');
    const quotes = statement.all(`%${q}%`);

    res.json(quotes);
});

app.get('/random', (req, res) => {
    const statement = db.prepare('SELECT content AS text FROM quotes ORDER BY RANDOM() LIMIT 1');
    const quote = statement.get();

    if (quote) {
        res.json({ text: quote.text });
    } else {
        res.status(404).json({ error: 'not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});