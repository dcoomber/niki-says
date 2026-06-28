function renderQuote(text) {
    const quoteDisplay = document.getElementById('quoteDisplay');
    quoteDisplay.innerHTML = text.replace(/\n/g, '<br>');
    document.title = `Quote: ${text}`;
    document.querySelector('meta[name="description"]').setAttribute('content', text);
}

async function displayQuoteById(id) {
    const response = await fetch(`/msg?id=${id}`);
    const data = await response.json();
    renderQuote(data.text);
    document.getElementById('searchResults').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
        displayQuoteById(id);
    } else {
        const response = await fetch('/random');
        const data = await response.json();
        renderQuote(data.text);
    }

    document.getElementById('searchResults').innerHTML = '';
});

document.getElementById('searchButton').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
    const results = await response.json();

    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    results.forEach(element => {
        const link = document.createElement('a');
        link.href = `/?id=${element.id}`;
        link.textContent = element.text;
        link.addEventListener('click', event => {
            event.preventDefault();
            history.pushState(null, '', `/?id=${element.id}`);
            displayQuoteById(element.id);
        });
        searchResults.appendChild(link);
        searchResults.appendChild(document.createElement('br'));
    });
});