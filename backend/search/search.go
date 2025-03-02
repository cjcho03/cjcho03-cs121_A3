package search

import (
	"log"
	"math"
	"sort"
	"sync"

	"backend/index_loader"
	"backend/utils"
)

// For the partitioned approach, we store docs, total doc count, and the index directory:
var (
	DocIDToURLPartitioned map[int]string
	TotalDocsPartitioned  int
	IndexDirData          *index_loader.IndexDir

	// We keep a cache of loaded leaf index files to avoid re-reading from disk repeatedly.
	indexCache = make(map[string]index_loader.IndexMap)
	cacheMutex sync.Mutex
)

// SetDataPartitioned initializes the search module with the doc store, total docs, and index directory.
func SetDataPartitioned(docs map[int]string, total int, dir *index_loader.IndexDir) {
	DocIDToURLPartitioned = docs
	TotalDocsPartitioned = total
	IndexDirData = dir
}

// getPostingsForToken loads the correct leaf index file for a token, then returns the postings for that token.
func getPostingsForToken(token string) ([]index_loader.Posting, bool) {
	if IndexDirData == nil {
		log.Println("IndexDirData is nil; did you call SetDataPartitioned?")
		return nil, false
	}

	// Determine which file to load for this token:
	filename := index_loader.GetIndexFileForToken(token, IndexDirData)

	// Check if we've already cached that file.
	cacheMutex.Lock()
	idx, found := indexCache[filename]
	cacheMutex.Unlock()

	if !found {
		// Load from disk
		loadedIdx, err := index_loader.LoadIndex(filename)
		if err != nil {
			log.Printf("Error loading index file %s: %v", filename, err)
			return nil, false
		}
		cacheMutex.Lock()
		indexCache[filename] = loadedIdx
		cacheMutex.Unlock()
		idx = loadedIdx
	}

	postings, ok := idx[token]
	return postings, ok
}

// Result holds a search result: the document URL and its score.
type Result struct {
	URL   string  `json:"url"`
	Score float64 `json:"score"`
}

// ProcessQuery tokenizes and stems the input query, applies a boolean AND across tokens,
// computes tf-idf cosine similarity, and returns the top 5 matching results.
func ProcessQuery(query string) []Result {
	if IndexDirData == nil {
		log.Println("IndexDirData is nil; did you call SetDataPartitioned?")
		return nil
	}

	// Tokenize and stem query terms.
	tokens := utils.Tokenize(query)
	if len(tokens) == 0 {
		return nil
	}
	queryFreq := make(map[string]int)
	var queryTokens []string
	for _, token := range tokens {
		stemmed := utils.Stem(token)
		queryTokens = append(queryTokens, stemmed)
		queryFreq[stemmed]++
	}

	// Boolean AND: track which documents contain every query token.
	docScores := make(map[int]map[string]int) // docID → {token → frequency}
	for i, token := range queryTokens {
		postings, ok := getPostingsForToken(token)
		if !ok {
			// No postings for this token => no results
			return []Result{}
		}

		currentDocs := make(map[int]int)
		for _, p := range postings {
			currentDocs[p.DocumentID] = p.Occurrences.TextCount
		}

		if i == 0 {
			// Initialize docScores with the first token's postings.
			for docID, freq := range currentDocs {
				docScores[docID] = map[string]int{token: freq}
			}
		} else {
			// For subsequent tokens, keep only docs that contain the token.
			for docID, tokenMap := range docScores {
				if freq, exists := currentDocs[docID]; exists {
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
		postings, _ := getPostingsForToken(token)
		df := len(postings)
		if df == 0 {
			continue
		}
		idf := math.Log(float64(TotalDocsPartitioned) / float64(df))
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
			postings, _ := getPostingsForToken(token)
			df := len(postings)
			if df == 0 {
				continue
			}
			idf := math.Log(float64(TotalDocsPartitioned) / float64(df))
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
			URL:   DocIDToURLPartitioned[docID],
			Score: score,
		})
	}

	// Sort results by descending score and return the top 5.
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})
	if len(results) > 5 {
		results = results[:5]
	}
	return results
}
