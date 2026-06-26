// Renders a quote's text into #quoteDisplay and updates the title/meta tags.
function renderQuote(text) {
    const quoteDisplay = document.getElementById('quoteDisplay');
    quoteDisplay.innerHTML = text.replace(/\n/g, '<br>');
    document.title = 'Niki Says - ' + text.substring(0, 60);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', text.substring(0, 160));
}

// Fetches a quote by id (/msg returns { text }), shows it, and clears any
// previous search results so only the search box and the selected quote remain.
function displayQuoteById(id) {
    fetch('/msg?id=' + encodeURIComponent(id))
        .then(response => response.json())
        .then(data => {
            renderQuote(data.text);
            document.getElementById('searchResults').innerHTML = '';
        })
        .catch(error => console.error('Error fetching quote:', error));
}

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
        displayQuoteById(id);
    } else {
        // /random returns { text } only (no id), so render the text directly.
        fetch('/random')
            .then(response => response.json())
            .then(data => renderQuote(data.text))
            .catch(error => console.error('Error fetching random quote:', error));
    }
});

document.getElementById('searchButton').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value;
    if (query.trim() === '') return;

    fetch('/search?q=' + encodeURIComponent(query))
        .then(response => response.json())
        .then(results => {
            // /search returns a bare JSON array: [{ id, text }, ...]
            const searchResults = document.getElementById('searchResults');
            searchResults.innerHTML = '';
            results.forEach(result => {
                const link = document.createElement('a');
                link.href = '/?id=' + result.id;
                link.textContent = result.text.substring(0, 60) + (result.text.length > 60 ? '...' : '');
                link.style.display = 'block';
                link.style.marginBottom = '10px';
                link.style.textDecoration = 'none';
                link.style.color = '#0070f3';
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    history.pushState(null, '', '/?id=' + result.id);
                    displayQuoteById(result.id);
                });
                searchResults.appendChild(link);
            });
        })
        .catch(error => console.error('Error fetching search results:', error));
});
