package index_loader

import (
	"encoding/json"
	"os"
	"strconv"
)

// DocEntry represents a document entry with three string fields.
type DocEntry struct {
	URL         string `json:"url"`
	Title    string `json:"title"`
	Description string `json:"description"`
}

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

// IndexMap maps a token to its postings.
type IndexMap map[string][]Posting

// IndexDir is the "root" index file: threshold keys + corresponding leaf filenames.
type IndexDir struct {
	Keys       []string `json:"keys"`
	IndexFiles []string `json:"indexFiles"`
}

// LoadIndexDir loads the partition "root" (index_dir.json).
func LoadIndexDir(filename string) (*IndexDir, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var dir IndexDir
	// Parse the JSON data and populate the dir struct with the corresponding values.
	if err := json.Unmarshal(data, &dir); err != nil {
		return nil, err
	}
	return &dir, nil
}

// LoadIndex reads a leaf index JSON (e.g., indexdir/index_0.json).
func LoadIndex(filename string) (IndexMap, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var idx IndexMap
	if err := json.Unmarshal(data, &idx); err != nil {
		return nil, err
	}
	return idx, nil
}

// LoadDocs reads docs.json and returns a map of document IDs to DocEntry objects.
func LoadDocs(filename string) (map[int]DocEntry, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	// Unmarshal into a temporary map with string keys.
	var raw map[string]DocEntry
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, err
	}
	docs := make(map[int]DocEntry)
	for key, entry := range raw {
		id, err := strconv.Atoi(key)
		if err != nil {
			continue
		}
		docs[id] = entry
	}
	return docs, nil
}

// GetIndexFileForToken picks which leaf file a token is in (based on Keys).
func GetIndexFileForToken(token string, dir *IndexDir) string {
	for i, key := range dir.Keys {
		if token < key {
			return "indexdir/" + dir.IndexFiles[i]
		}
	}
	// token >= all keys => last file
	return "indexdir/" + dir.IndexFiles[len(dir.IndexFiles)-1]
}
