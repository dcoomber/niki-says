var quotes = null; // Remove hardcoded quotes array

// Helper function to render a quote
function renderQuote(text) {
    var displayElement = document.getElementById('quoteDisplay');
    displayElement.innerHTML = text.replace(/\n/g, '<br>');
    document.title = 'Random Quote: ' + text;
    document.querySelector('meta[name="description"]').setAttribute('content', text);
}

// Helper function to display a quote by ID
function displayQuoteById(id) {
    fetch('/msg?id=' + id)
        .then(response => response.json())
        .then(data => {
            renderQuote(data.text);
            document.getElementById('searchResults').innerHTML = '';
        })
        .catch(error => console.error('Error fetching quote:', error));
}

// On page load
document.addEventListener('DOMContentLoaded', function() {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id')) {
        displayQuoteById(urlParams.get('id'));
    } else {
        fetch('/random')
            .then(response => response.json())
            .then(data => renderQuote(data.text))
            .catch(error => console.error('Error fetching random quote:', error));
    }
    document.getElementById('searchResults').innerHTML = ''; // Ensure search results are empty
});

// Implement Search
document.getElementById('searchButton').addEventListener('click', function() {
    var query = document.getElementById('searchInput').value;
    if (query) {
        fetch('/search?q=' + encodeURIComponent(query))
            .then(response => response.json())
            .then(results => {
                var searchResultsElement = document.getElementById('searchResults');
                searchResultsElement.innerHTML = '';
                results.forEach(function(element) {
                    var link = document.createElement('a');
                    link.href = '/?id=' + element.id;
                    link.textContent = element.text;
                    link.addEventListener('click', function(event) {
                        event.preventDefault();
                        history.pushState(null, '', this.href);
                        displayQuoteById(element.id);
                    });
                    searchResultsElement.appendChild(link);
                    searchResultsElement.appendChild(document.createElement('br'));
                });
            })
            .catch(error => console.error('Error fetching search results:', error));
    }
});