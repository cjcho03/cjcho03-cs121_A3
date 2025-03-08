package utils

import (
	"strings"

	"github.com/reiver/go-porterstemmer"
)

// Tokenize splits a string into tokens.
func Tokenize(text string) []string {
	var tokens []string
	start := -1
	for i, ch := range text {
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			if start < 0 {
				start = i
			}
		} else {
			if start >= 0 {
				tokens = append(tokens, text[start:i])
				start = -1
			}
		}
	}
	// Handle last token
	if start >= 0 {
		tokens = append(tokens, text[start:])
	}
	return tokens
}

// Stem applies the Porter Stemmer (via github.com/reiver/go-porterstemmer).
func Stem(word string) string {
	// Make sure to lower-case before stemming,
	// so you don't accidentally skip uppercase words.
	stemmed := porterstemmer.StemString(strings.ToLower(word))
	return stemmed
}
