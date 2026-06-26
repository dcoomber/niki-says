const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('quotes.db');

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

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});