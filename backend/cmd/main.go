package main

import (
	"log"
	"net/http"
	"os"

	"backend/handlers"
	"backend/index_loader"
	"backend/search"
)

func main() {
	// 1) Load docs and index directory.
	docs, err := index_loader.LoadDocs("indexdir/docs.json")
	if err != nil {
		log.Fatalf("Error loading docs: %v", err)
	}
	idxDir, err := index_loader.LoadIndexDir("indexdir/index_dir.json")
	if err != nil {
		log.Fatalf("Error loading index directory: %v", err)
	}

	// 2) Initialize the search module with docs as DocEntry objects.
	search.SetDataPartitioned(docs, len(docs), idxDir)

	// 3) Register a single endpoint at /search.
	http.HandleFunc("/search", handlers.SearchHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Listening on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
