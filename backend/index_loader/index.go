package index_loader

import (
	"encoding/json"
	"os"
	"strconv"
)

// Occurrence holds frequency counts for a token.
type Occurrence struct {
	TextCount      int `json:"textCount"`
	HeaderCount    int `json:"headerCount"`
	ImportantCount int `json:"importantCount"`
}

// Posting represents an entry for a token in the inverted index.
type Posting struct {
	DocumentID  int        `json:"documentId"`
	Occurrences Occurrence `json:"occurrences"`
}

// IndexMap maps a token to its list of postings.
type IndexMap map[string][]Posting

// IndexDir represents the structure of your index directory JSON file.
// It contains threshold keys and the corresponding leaf index file names.
type IndexDir struct {
	Keys       []string `json:"keys"`
	IndexFiles []string `json:"indexFiles"`
}

// LoadIndexDir loads the index directory from a JSON file (e.g., "indexdir/index_dir.json").
func LoadIndexDir(filename string) (*IndexDir, error) {
	bytes, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var dir IndexDir
	if err := json.Unmarshal(bytes, &dir); err != nil {
		return nil, err
	}
	return &dir, nil
}

// LoadIndex reads one of the leaf inverted index files (e.g., "indexdir/index_0.json").
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

// LoadDocs reads the document store from a JSON file (e.g., "indexdir/docs.json") and
// returns a map from document IDs to URLs.
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
		switch v := val.(type) {
		case float64:
			docs[int(v)] = url
		case string:
			id, err := strconv.Atoi(v)
			if err == nil {
				docs[id] = url
			}
		}
	}
	return docs, nil
}

// GetIndexFileForToken determines which leaf index file should contain postings for the given token.
// It uses the keys from the IndexDir to decide the correct file, then prepends the folder name.
func GetIndexFileForToken(token string, dir *IndexDir) string {
	for i, key := range dir.Keys {
		if token < key {
			return "indexdir/" + dir.IndexFiles[i]
		}
	}
	// If token >= all keys, return the last file.
	return "indexdir/" + dir.IndexFiles[len(dir.IndexFiles)-1]
}
