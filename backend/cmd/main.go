package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"

	"backend/index_loader"
	"backend/search"
)

func main() {
	docs, err := index_loader.LoadDocs("indexdir/docs.json")
	if err != nil {
		log.Fatalf("Error loading docs: %v", err)
	}
	idxDir, err := index_loader.LoadIndexDir("indexdir/index_dir.json")
	if err != nil {
		log.Fatalf("Error loading index directory: %v", err)
	}
	search.SetDataPartitioned(docs, len(docs), idxDir)

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

		results := search.ProcessQuery(line)
		if len(results) == 0 {
			fmt.Println("No results found.")
		} else {
			for i, r := range results {
				fmt.Printf("%d. URL: %s (Score: %.4f)\n", i+1, r.URL, r.Score)
			}
		}
		fmt.Println("---------------")
	}
}
