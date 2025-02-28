package index_loader

import (
	"os"
	"reflect"
	"testing"
)

func TestLoadIndex(t *testing.T) {
	// Create a temporary file with a simple index JSON.
	content := `{"word": [{"documentId": 1, "occurrences": 2}, {"documentId": 2, "occurrences": 3}]}`
	tmpfile, err := os.CreateTemp("", "index_test_*.json")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tmpfile.Name())

	if _, err := tmpfile.Write([]byte(content)); err != nil {
		t.Fatal(err)
	}
	if err := tmpfile.Close(); err != nil {
		t.Fatal(err)
	}

	// Call LoadIndex directly.
	idx, err := LoadIndex(tmpfile.Name())
	if err != nil {
		t.Fatalf("LoadIndex returned error: %v", err)
	}

	// Check that the token "word" exists.
	postings, ok := idx["word"]
	if !ok {
		t.Errorf("Expected token 'word' in index")
		return
	}
	if len(postings) != 2 {
		t.Errorf("Expected 2 postings for 'word', got %d", len(postings))
	}
	expected := []Posting{
		{DocumentID: 1, Occurrences: 2},
		{DocumentID: 2, Occurrences: 3},
	}
	if !reflect.DeepEqual(postings, expected) {
		t.Errorf("Postings for 'word' do not match expected.\nGot: %v\nExpected: %v", postings, expected)
	}
}

func TestLoadDocs(t *testing.T) {
	content := `{"http://example.com": "1", "http://example.org": 2}`
	tmpfile, err := os.CreateTemp("", "docs_test_*.json")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tmpfile.Name())

	if _, err := tmpfile.Write([]byte(content)); err != nil {
		t.Fatal(err)
	}
	if err := tmpfile.Close(); err != nil {
		t.Fatal(err)
	}

	docs, err := LoadDocs(tmpfile.Name())
	if err != nil {
		t.Fatalf("LoadDocs returned error: %v", err)
	}

	expected := map[int]string{
		1: "http://example.com",
		2: "http://example.org",
	}
	if !reflect.DeepEqual(docs, expected) {
		t.Errorf("LoadDocs result does not match expected.\nGot: %v\nExpected: %v", docs, expected)
	}
}
