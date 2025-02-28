package utils

import (
	"reflect"
	"testing"
)

func TestTokenize(t *testing.T) {
	input := "Hello, world! 123, testing."
	expected := []string{"Hello", "world", "123", "testing"}
	result := Tokenize(input)
	if !reflect.DeepEqual(result, expected) {
		t.Errorf("Tokenize(%q) = %v; expected %v", input, result, expected)
	}
}

func TestStem(t *testing.T) {
	// Since the current Stem function only converts to lowercase,
	// verify that behavior.
	input := "HELLO"
	expected := "hello"
	result := Stem(input)
	if result != expected {
		t.Errorf("Stem(%q) = %v; expected %v", input, result, expected)
	}
}
