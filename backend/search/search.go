package search

import (
	"math"
	"sort"

	"backend/index_loader"
	"backend/utils"
)

var (
	DocIDToDocEntryPartitioned map[int]index_loader.DocEntry
	TotalDocsPartitioned       int
	IndexDirData               *index_loader.IndexDir

	// Cache mapping index file names to IndexMap.
	indexCache = make(map[string]index_loader.IndexMap)
	// Cache mapping token directly to its postings.
	tokenCache = make(map[string][]index_loader.Posting)
	// Cache computed idf values.
	idfCache = make(map[string]float64)
)

// A list of common stopwords and frequent tokens to preload.
var frequentTokens = []string{
	// Common English stopwords.
	"i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
	"yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
	"her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
	"theirs", "themselves", "what", "which", "who", "whom", "this", "that",
	"these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
	"have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
	"the", "and", "but", "if", "or", "because", "as", "until", "while", "of",
	"at", "by", "for", "with", "about", "against", "between", "into", "through",
	"during", "before", "after", "above", "below", "to", "from", "up", "down",
	"in", "out", "on", "off", "over", "under", "again", "further", "then",
	"once", "here", "there", "when", "where", "why", "how", "all", "any",
	"both", "each", "few", "more", "most", "other", "some", "such", "no", "nor",
	"not", "only", "own", "same", "so", "than", "too", "very", "can",
	"will", "just", "don", "should", "now",
	// Domain-specific and additional tokens.
	"computer", "science", "software", "engineering", "university", "major", "degree", "bachelor", "master", "phd",
	"course", "class", "lecture", "lab", "assignment", "homework", "exam", "quiz", "project", "research", "paper",
}

// PreloadFrequentTokens forces the loading of a given list of tokens into the cache.
// It calls getPostingsForToken for each token.
func PreloadFrequentTokens(tokens []string) {
	for _, token := range tokens {
		getPostingsForToken(token)
	}
}

// SetDataPartitioned initializes the search module with document entries, document count,
// and the index directory. It also preloads a selected set of tokens (including stopwords).
func SetDataPartitioned(docs map[int]index_loader.DocEntry, total int, dir *index_loader.IndexDir) {
	DocIDToDocEntryPartitioned = docs
	TotalDocsPartitioned = total
	IndexDirData = dir
	PreloadFrequentTokens(frequentTokens)
}

// getPostingsForToken returns the postings for a given token.
// It first checks the tokenCache and, if missing, loads the appropriate index file.
func getPostingsForToken(token string) ([]index_loader.Posting, bool) {
	// Check tokenCache first.
	if postings, ok := tokenCache[token]; ok {
		return postings, true
	}

	if IndexDirData == nil {
		return nil, false
	}

	// Determine the index file based on the token.
	filename := index_loader.GetIndexFileForToken(token, IndexDirData)

	// Look up the index from the cache.
	idx, found := indexCache[filename]
	if !found {
		loadedIdx, err := index_loader.LoadIndex(filename)
		if err != nil {
			return nil, false
		}
		indexCache[filename] = loadedIdx
		idx = loadedIdx
	}

	postings, ok := idx[token]
	if ok {
		// Cache the token's postings for future queries.
		tokenCache[token] = postings
	}
	return postings, ok
}

// Result represents the final document result with a URL, title, description, and a score.
type Result struct {
	URL         string  `json:"url"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Score       float64 `json:"score"`
}

// ProcessQuery tokenizes, stems, performs a Boolean AND, computes tf-idf weights,
// and returns the top results.
func ProcessQuery(query string) []Result {
	if IndexDirData == nil {
		return nil
	}

	// 1) Tokenize.
	rawTokens := utils.Tokenize(query)
	if len(rawTokens) == 0 {
		return nil
	}

	// 2) Stem and count token frequency.
	queryFreq := make(map[string]int)
	var queryTokens []string
	for _, raw := range rawTokens {
		stemmed := utils.Stem(raw)
		queryTokens = append(queryTokens, stemmed)
		queryFreq[stemmed]++
	}

	// 3) Boolean AND (intersection) across tokens.
	docScores := make(map[int]map[string]int)
	for i, token := range queryTokens {
		postings, found := getPostingsForToken(token)
		if !found || len(postings) == 0 {
			// If any token yields no documents, return an empty result.
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
		return []Result{}
	}

	// 4) Build query vector (tf-idf) and compute IDF from cache.
	queryVec := make(map[string]float64)
	for token, freq := range queryFreq {
		var idf float64
		if cached, ok := idfCache[token]; ok {
			idf = cached
		} else {
			postings, _ := getPostingsForToken(token)
			df := len(postings)
			if df == 0 {
				continue
			}
			idf = math.Log(float64(TotalDocsPartitioned) / float64(df))
			idfCache[token] = idf
		}
		queryVec[token] = float64(freq) * idf
	}

	// 5) Compute the norm of the query vector.
	var queryNorm float64
	for _, weight := range queryVec {
		queryNorm += weight * weight
	}
	queryNorm = math.Sqrt(queryNorm)

	// 6) Compute document scores.
	var results []Result
	for docID, freqs := range docScores {
		var dot, docNorm float64
		for token, tf := range freqs {
			postings, _ := getPostingsForToken(token)
			df := len(postings)
			if df == 0 {
				continue
			}
			var idf float64
			if cached, ok := idfCache[token]; ok {
				idf = cached
			} else {
				idf = math.Log(float64(TotalDocsPartitioned) / float64(df))
				idfCache[token] = idf
			}
			docWeight := float64(tf) * idf
			dot += docWeight * queryVec[token]
			docNorm += docWeight * docWeight
		}
		docNorm = math.Sqrt(docNorm)

		var score float64
		if queryNorm != 0 && docNorm != 0 {
			score = dot
		}

		results = append(results, Result{
			URL:         DocIDToDocEntryPartitioned[docID].URL,
			Title:       DocIDToDocEntryPartitioned[docID].Title,
			Description: DocIDToDocEntryPartitioned[docID].Description,
			Score:       score,
		})
	}

	// 7) Sort the results in descending order by score.
	sort.Slice(results, func(i, j int) bool {
		rankI, _ := index_loader.GetRank(results[i].URL)
    	rankJ, _ := index_loader.GetRank(results[j].URL)
		if rankI != rankJ {
			return rankI > rankJ
		}
		if results[i].Score != results[j].Score {
			return results[i].Score > results[j].Score
		}
	
		return results[i].URL < results[j].URL
	})

	return results
}
