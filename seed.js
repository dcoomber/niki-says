const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database('quotes.db');
db.exec(`CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL)`);

const src = fs.readFileSync('public/js/javascript.js', 'utf-8');
const start = src.indexOf('[', src.indexOf('var quotes'));
const end = src.indexOf('\n]', start);
const literal = src.slice(start, end + 2);
const quotes = JSON.parse(literal);

const insert = db.prepare('INSERT INTO quotes (content) VALUES (?)');

for (const quote of quotes) {
    insert.run(quote);
}

console.log(`${quotes.length} quotes inserted`);
db.close();