package main

import (
	"fmt"
	"log"

	"backend/index_loader"
	"backend/search"
)

func main() {
	// Load the document store from the indexdir folder.
	docs, err := index_loader.LoadDocs("indexdir/docs.json")
	if err != nil {
		log.Fatalf("Error loading docs: %v", err)
	}

	// Load the index directory from the indexdir folder.
	indexDir, err := index_loader.LoadIndexDir("indexdir/index_dir.json")
	if err != nil {
		log.Fatalf("Error loading index directory: %v", err)
	}

	// Initialize the search module for partitioned indexes.
	search.SetDataPartitioned(docs, len(docs), indexDir)

	// Define some test queries.
	queries := []string{
		"cristina lopes",
		"machine learning",
		"ACM",
		"master of software engineering",
	}

	// Process each query and print the results.
	for _, query := range queries {
		fmt.Printf("Query: %s\n", query)
		results := search.ProcessQuery(query)
		if len(results) == 0 {
			fmt.Println("  No results found.")
		} else {
			for _, res := range results {
				fmt.Printf("  URL: %s, Score: %.4f\n", res.URL, res.Score)
			}
		}
		fmt.Println()
	}
}
