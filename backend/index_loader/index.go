package index_loader

import (
	"encoding/json"
	"os"
	"strconv"
)

// Posting represents an entry for a token in the inverted index.
type Posting struct {
	DocumentID  int `json:"documentId"`
	Occurrences int `json:"occurrences"`
}

// IndexMap maps a token to its list of postings.
type IndexMap map[string][]Posting

// LoadIndex reads the inverted index from a JSON file.
func LoadIndex(filename string) (IndexMap, error) {
	bytes, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var idx IndexMap
	if err := json.Unmarshal(bytes, &idx); err != nil {
		return nil, err
	}
	return idx, nil
}

// LoadDocs reads the document store from a JSON file and inverts the mapping
// to return a map from document IDs to URLs.
func LoadDocs(filename string) (map[int]string, error) {
	bytes, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var rawDocs map[string]interface{}
	if err := json.Unmarshal(bytes, &rawDocs); err != nil {
		return nil, err
	}
	docs := make(map[int]string)
	for url, val := range rawDocs {
		var docID int
		switch v := val.(type) {
		case float64:
			docID = int(v)
		case string:
			id, err := strconv.Atoi(v)
			if err != nil {
				continue
			}
			docID = id
		default:
			continue
		}
		docs[docID] = url
	}
	return docs, nil
}
