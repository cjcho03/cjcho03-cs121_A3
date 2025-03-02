package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"backend/search"
)

// SearchHandler handles API requests to /search.
func SearchHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Missing query parameter 'q'", http.StatusBadRequest)
		return
	}
	results := search.ProcessQuery(query)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// IndexPageHandler serves a simple HTML page with a search interface.
func IndexPageHandler(w http.ResponseWriter, r *http.Request) {
	html := `
	<!DOCTYPE html>
	<html>
	<head>
		<title>Search Engine</title>
		<script>
			function search() {
				var q = document.getElementById("query").value;
				fetch("/search?q=" + encodeURIComponent(q))
					.then(response => response.json())
					.then(data => {
						var resultsDiv = document.getElementById("results");
						resultsDiv.innerHTML = "";
						if(data.length == 0){
							resultsDiv.innerHTML = "<p>No results found.</p>";
						} else {
							data.forEach(function(item){
								var p = document.createElement("p");
								p.innerHTML = "<a href='" + item.url + "'>" + item.url + "</a> (score: " + item.score.toFixed(4) + ")";
								resultsDiv.appendChild(p);
							});
						}
					});
			}
		</script>
	</head>
	<body>
		<h1>Search Engine</h1>
		<input type="text" id="query" placeholder="Enter your query">
		<button onclick="search()">Search</button>
		<div id="results"></div>
	</body>
	</html>
	`
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, html)
}
