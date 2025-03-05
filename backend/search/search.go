package search

import (
	"math"
	"sort"
	"sync"

	"backend/index_loader"
	"backend/utils"
)

var (
	// Updated to hold DocEntry objects instead of just URL strings.
	DocIDToDocEntryPartitioned map[int]index_loader.DocEntry
	TotalDocsPartitioned       int
	IndexDirData               *index_loader.IndexDir

	indexCache = make(map[string]index_loader.IndexMap)
	cacheMutex sync.Mutex
)

// SetDataPartitioned initializes the search module with docs, doc count, and index directory.
// It now accepts a map[int]index_loader.DocEntry.
func SetDataPartitioned(docs map[int]index_loader.DocEntry, total int, dir *index_loader.IndexDir) {
	DocIDToDocEntryPartitioned = docs
	TotalDocsPartitioned = total
	IndexDirData = dir
}

// getPostingsForToken loads/returns postings for a given token.
func getPostingsForToken(token string) ([]index_loader.Posting, bool) {
	if IndexDirData == nil {
		// Return false if not initialized
		return nil, false
	}

	filename := index_loader.GetIndexFileForToken(token, IndexDirData)

	cacheMutex.Lock()
	idx, found := indexCache[filename]
	cacheMutex.Unlock()

	if !found {
		loadedIdx, err := index_loader.LoadIndex(filename)
		if err != nil {
			// If there's an error loading the file, return false
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
		// Not initialized, return nothing
		return nil
	}

	// 1) Tokenize
	rawTokens := utils.Tokenize(query)
	if len(rawTokens) == 0 {
		// No tokens after tokenization
		return nil
	}

	// 2) Stem
	queryFreq := make(map[string]int)
	var queryTokens []string
	for _, raw := range rawTokens {
		stemmed := utils.Stem(raw)
		queryTokens = append(queryTokens, stemmed)
		queryFreq[stemmed]++
	}

	// 3) Boolean AND across tokens
	docScores := make(map[int]map[string]int)
	for i, token := range queryTokens {
		postings, found := getPostingsForToken(token)
		if !found || len(postings) == 0 {
			// If any token yields no docs, final result is empty
			return []Result{}
		}

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
			for docID, freq := range currentDocs {
				docScores[docID] = map[string]int{token: freq}
			}
		} else {
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
		// No docs remain after intersection
		return []Result{}
	}

	// 4) Build query vector (tf-idf)
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
			URL:   DocIDToDocEntryPartitioned[docID].URL,
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
