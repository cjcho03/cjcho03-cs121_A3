package search

import (
	"math"
	"sort"

	"backend/index_loader"
	"backend/utils"
)

// Global variables to hold the loaded index and document store.
var (
	IndexData  index_loader.IndexMap
	DocIDToURL map[int]string
	TotalDocs  int
)

// Result holds a search result: the document URL and its score.
type Result struct {
	URL   string  `json:"url"`
	Score float64 `json:"score"`
}

// SetData initializes the search module with the inverted index and doc store.
func SetData(idx index_loader.IndexMap, docs map[int]string) {
	IndexData = idx
	DocIDToURL = docs
	TotalDocs = len(docs)
}

// ProcessQuery tokenizes and stems the input query, applies a boolean AND across tokens,
// computes tf-idf cosine similarity, and returns the top 5 matching results.
func ProcessQuery(query string) []Result {
	// Tokenize and stem query terms.
	tokens := utils.Tokenize(query)
	if len(tokens) == 0 {
		return nil
	}
	queryFreq := make(map[string]int)
	var queryTokens []string
	for _, token := range tokens {
		t := utils.Stem(token)
		queryTokens = append(queryTokens, t)
		queryFreq[t]++
	}

	// Boolean AND: retain only documents that contain every query token.
	docScores := make(map[int]map[string]int)
	for i, token := range queryTokens {
		postings, ok := IndexData[token]
		if !ok {
			return []Result{}
		}
		current := make(map[int]int)
		for _, p := range postings {
			current[p.DocumentID] = p.Occurrences
		}
		if i == 0 {
			// Initialize docScores with the first token's postings.
			for docID, freq := range current {
				docScores[docID] = map[string]int{token: freq}
			}
		} else {
			// For subsequent tokens, remove docs not containing the token.
			for docID, tokenMap := range docScores {
				if freq, exists := current[docID]; exists {
					tokenMap[token] = freq
				} else {
					delete(docScores, docID)
				}
			}
		}
	}
	if len(docScores) == 0 {
		return []Result{}
	}

	// Compute tf-idf weights for the query.
	queryVec := make(map[string]float64)
	for token, freq := range queryFreq {
		df := len(IndexData[token])
		idf := math.Log(float64(TotalDocs) / float64(df))
		queryVec[token] = float64(freq) * idf
	}
	var queryNorm float64
	for _, weight := range queryVec {
		queryNorm += weight * weight
	}
	queryNorm = math.Sqrt(queryNorm)

	// Compute cosine similarity for each document.
	var results []Result
	for docID, freqs := range docScores {
		var docNorm, dot float64
		for token, tf := range freqs {
			df := len(IndexData[token])
			idf := math.Log(float64(TotalDocs) / float64(df))
			docWeight := float64(tf) * idf
			queryWeight := queryVec[token]
			dot += docWeight * queryWeight
			docNorm += docWeight * docWeight
		}
		docNorm = math.Sqrt(docNorm)
		var score float64
		if queryNorm*docNorm != 0 {
			score = dot / (queryNorm * docNorm)
		}
		results = append(results, Result{
			URL:   DocIDToURL[docID],
			Score: score,
		})
	}

	// Sort results in descending order and return the top 5.
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})
	if len(results) > 5 {
		results = results[:5]
	}
	return results
}
