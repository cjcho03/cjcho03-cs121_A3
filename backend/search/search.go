package search

import (
	"log"
	"math"
	"sort"
	"sync"

	"backend/index_loader"
	"backend/utils"
)

var (
	// Partitioned data
	DocIDToURLPartitioned map[int]string
	TotalDocsPartitioned  int
	IndexDirData          *index_loader.IndexDir

	// Cached leaf files
	indexCache = make(map[string]index_loader.IndexMap)
	cacheMutex sync.Mutex
)

// SetDataPartitioned initializes the search module with docs, doc count, and index directory.
func SetDataPartitioned(docs map[int]string, total int, dir *index_loader.IndexDir) {
	DocIDToURLPartitioned = docs
	TotalDocsPartitioned = total
	IndexDirData = dir
}

// getPostingsForToken loads/returns postings for a given token.
func getPostingsForToken(token string) ([]index_loader.Posting, bool) {
	if IndexDirData == nil {
		log.Println("[search] IndexDirData is nil; did you call SetDataPartitioned?")
		return nil, false
	}

	// Which file holds this token?
	filename := index_loader.GetIndexFileForToken(token, IndexDirData)

	// Check our cache first
	cacheMutex.Lock()
	idx, found := indexCache[filename]
	cacheMutex.Unlock()

	if !found {
		// Load from disk
		loadedIdx, err := index_loader.LoadIndex(filename)
		if err != nil {
			log.Printf("[search] Error loading index file %s for token '%s': %v",
				filename, token, err)
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

// Result represents the final doc result with a score.
type Result struct {
	URL   string  `json:"url"`
	Score float64 `json:"score"`
}

// ProcessQuery runs a Boolean AND on all tokens, then ranks docs using tf-idf.
func ProcessQuery(query string) []Result {
	if IndexDirData == nil {
		log.Println("[search] IndexDirData is nil; did you call SetDataPartitioned?")
		return nil
	}

	// 1) Tokenize
	rawTokens := utils.Tokenize(query)
	if len(rawTokens) == 0 {
		log.Printf("[search] Query %q produced no tokens after tokenization.\n", query)
		return nil
	}

	// 2) Stem
	queryFreq := make(map[string]int)
	var queryTokens []string
	for _, raw := range rawTokens {
		stemmed := utils.Stem(raw)
		// Debug print to see raw vs stem
		log.Printf("[search] Raw token: %q => Stem: %q\n", raw, stemmed)

		queryTokens = append(queryTokens, stemmed)
		queryFreq[stemmed]++
	}

	log.Printf("[search] Processing query: %q => tokens: %v\n", query, queryTokens)

	// 3) Boolean AND across tokens
	docScores := make(map[int]map[string]int)
	for i, token := range queryTokens {
		postings, found := getPostingsForToken(token)
		if !found || len(postings) == 0 {
			log.Printf("[search] No postings found for token %q => no results.\n", token)
			return []Result{}
		}

		// For each doc that has this token, store combined frequencies
		currentDocs := make(map[int]int)
		for _, p := range postings {
			freq := p.Occurrences.TextCount +
				p.Occurrences.HeaderCount +
				p.Occurrences.ImportantCount

			if freq > 0 {
				currentDocs[p.DocumentID] = freq
			}
		}

		if i == 0 {
			// Initialize docScores
			for docID, freq := range currentDocs {
				docScores[docID] = map[string]int{token: freq}
			}
		} else {
			// Intersect with existing docs
			for docID, tokenMap := range docScores {
				if freq, ok := currentDocs[docID]; ok {
					tokenMap[token] = freq
				} else {
					delete(docScores, docID)
				}
			}
		}
	}

	if len(docScores) == 0 {
		log.Println("[search] docScores is empty after intersection => no results.")
		return []Result{}
	}

	// 4) Build query vector (tf-idf)
	queryVec := make(map[string]float64)
	for token, freq := range queryFreq {
		postings, _ := getPostingsForToken(token) // already loaded
		df := len(postings)
		if df == 0 {
			continue
		}
		// IDF
		idf := math.Log(float64(TotalDocsPartitioned) / float64(df))
		queryVec[token] = float64(freq) * idf
	}

	// 5) Query vector norm
	var queryNorm float64
	for _, weight := range queryVec {
		queryNorm += weight * weight
	}
	queryNorm = math.Sqrt(queryNorm)

	// 6) Compute doc scores
	var results []Result
	for docID, freqs := range docScores {
		var dot, docNorm float64
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
			docNorm += (docWeight * docWeight)
		}
		docNorm = math.Sqrt(docNorm)

		var score float64
		if queryNorm != 0 && docNorm != 0 {
			score = dot / (queryNorm * docNorm)
		}

		results = append(results, Result{
			URL:   DocIDToURLPartitioned[docID],
			Score: score,
		})
	}

	// 7) Sort descending by score
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	// 8) Return top 5
	if len(results) > 5 {
		results = results[:5]
	}
	return results
}
