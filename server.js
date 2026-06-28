const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('quotes.db');

app.get('/msg', (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Invalid request' });

    const stmt = db.prepare('SELECT content AS text FROM quotes WHERE id = ?');
    const row = stmt.get(id);

    if (row) {
        res.json(row);
    } else {
        res.status(404).json({ error: "not found" });
    }
});

app.get('/search', (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Invalid request' });

    const stmt = db.prepare('SELECT id, content AS text FROM quotes WHERE content LIKE ?');
    const rows = stmt.all(`%${q}%`);

    res.json(rows);
});

app.get('/random', (req, res) => {
    const stmt = db.prepare('SELECT content AS text FROM quotes ORDER BY RANDOM() LIMIT 1');
    const row = stmt.get();

    if (row) {
        res.json(row);
    } else {
        res.status(404).json({ error: "not found" });
    }
});

app.get('/', (req, res) => {
    let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

    const id = req.query.id;
    if (id) {
        const stmt = db.prepare('SELECT content AS text FROM quotes WHERE id = ?');
        const row = stmt.get(id);

        if (row) {
            let description = row.text.replace(/\s+/g, ' ').substring(0, 200).trim() + '...';
            description = description
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

            description = '“' + description + '”';

            const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
            const host = req.headers['x-forwarded-host'] || req.get('host');
            const base = process.env.PUBLIC_BASE_URL || (proto + '://' + host);

            html = html
                .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${description}"`)
                .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${description}"`);
            html = html.replace('</head>', '<meta name="twitter:card" content="summary_large_image">\n</head>');
            html = html
                .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${base + '/?id=' + id}"`)
                .replace(/<meta property="og:image" content="[^"]*"/, '<meta property="og:image" content="' + base + '/images/niki-smug1-preview.png">');
        }
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});