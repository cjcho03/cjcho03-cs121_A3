package utils

import (
	"regexp"
	"strings"
)

// Tokenize splits a text into alphanumeric tokens.
func Tokenize(text string) []string {
	re := regexp.MustCompile(`[A-Za-z0-9]+`)
	return re.FindAllString(text, -1)
}

// Stem returns a stemmed version of a token.
// Replace this stub with a proper Porter stemmer if desired.
func Stem(token string) string {
	// For now, simply return the token in lowercase.
	return strings.ToLower(token)
}
