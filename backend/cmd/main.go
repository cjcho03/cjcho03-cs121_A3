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
	// Load the index.
	idx, err := index_loader.LoadIndex("../index.json")
	if err != nil {
		log.Fatalf("Error loading index: %v", err)
	}
	// Load and invert the document store.
	docs, err := index_loader.LoadDocs("docs.json")
	if err != nil {
		log.Fatalf("Error loading docs: %v", err)
	}
	// Initialize the search module with the loaded data.
	search.SetData(idx, docs)

	// Set up HTTP endpoints.
	http.HandleFunc("/search", handlers.SearchHandler)
	http.HandleFunc("/", handlers.IndexPageHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server running on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
