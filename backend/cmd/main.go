package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"backend/index_loader"
	"backend/search"
)

func main() {
	// 1) Load docs.json and index_dir.json
	docs, err := index_loader.LoadDocs("indexdir/docs.json")
	if err != nil {
		log.Fatalf("Error loading docs: %v", err)
	}
	idxDir, err := index_loader.LoadIndexDir("indexdir/index_dir.json")
	if err != nil {
		log.Fatalf("Error loading index directory: %v", err)
	}

	// 2) Initialize the search module
	search.SetDataPartitioned(docs, len(docs), idxDir)

	// 3) Interactive loop to read queries from stdin
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("Enter query (or 'exit'): ")
		line, _ := reader.ReadString('\n')
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if line == "exit" {
			break
		}

		// Measure how long the query takes
		start := time.Now()

		results := search.ProcessQuery(line)

		elapsed := time.Since(start) // end time

		// Print results
		if len(results) == 0 {
			fmt.Println("No results found.")
		} else {
			for i, r := range results {
				fmt.Printf("%d. URL: %s (Score: %.4f)\n", i+1, r.URL, r.Score)
			}
		}

		// Print query time in milliseconds
		fmt.Printf("Query time: %.2fms\n", float64(elapsed.Microseconds())/1000.0)
		fmt.Println("---------------")
	}
}
