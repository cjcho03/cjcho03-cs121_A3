// File: search/search_test.go
package search

import (
	"testing"

	"backend/index_loader"
)

// setupTestIndex sets up a small index and document store for testing.
func setupTestIndex() {
	// Create a simple index where:
	// - The token "cristina" appears only in document 0.
	// - The token "lopes" appears only in document 0.
	// - The token "machine" appears only in document 1.
	// - The token "learning" appears only in document 1.
	IndexData = map[string][]index_loader.Posting{
		"cristina": {
			{DocumentID: 0, Occurrences: 3},
		},
		"lopes": {
			{DocumentID: 0, Occurrences: 2},
		},
		"machine": {
			{DocumentID: 1, Occurrences: 3},
		},
		"learning": {
			{DocumentID: 1, Occurrences: 2},
		},
	}
	DocIDToURL = map[int]string{
		0: "http://example.com/doc0",
		1: "http://example.com/doc1",
	}
	TotalDocs = 2
}

// TestProcessQuery_NonexistentToken verifies that querying a token not present in the index returns no results.
func TestProcessQuery_NonexistentToken(t *testing.T) {
	setupTestIndex()
	results := ProcessQuery("nonexistent")
	if len(results) != 0 {
		t.Errorf("Expected no results for nonexistent token, got %d", len(results))
	}
}

// TestProcessQuery_CristinaLopes verifies that a query containing tokens found in the same document returns that document.
func TestProcessQuery_CristinaLopes(t *testing.T) {
	setupTestIndex()
	results := ProcessQuery("cristina lopes")
	if len(results) != 1 {
		t.Errorf("Expected 1 result for 'cristina lopes', got %d", len(results))
		return
	}
	expectedURL := "http://example.com/doc0"
	if results[0].URL != expectedURL {
		t.Errorf("Expected URL %s, got %s", expectedURL, results[0].URL)
	}
}

// TestProcessQuery_MachineLearning verifies that a query with tokens unique to document 1 returns that document.
func TestProcessQuery_MachineLearning(t *testing.T) {
	setupTestIndex()
	results := ProcessQuery("machine learning")
	if len(results) != 1 {
		t.Errorf("Expected 1 result for 'machine learning', got %d", len(results))
		return
	}
	expectedURL := "http://example.com/doc1"
	if results[0].URL != expectedURL {
		t.Errorf("Expected URL %s, got %s", expectedURL, results[0].URL)
	}
}

// TestProcessQuery_AndBoolean verifies that a query requiring tokens from different documents returns no results.
func TestProcessQuery_AndBoolean(t *testing.T) {
	setupTestIndex()
	// "cristina machine" requires that a document contain both tokens.
	// In our setup, "cristina" is only in doc 0 and "machine" is only in doc 1.
	results := ProcessQuery("cristina machine")
	if len(results) != 0 {
		t.Errorf("Expected 0 results for 'cristina machine', got %d", len(results))
	}
}
