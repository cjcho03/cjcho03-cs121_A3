package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"backend/search"
)

// SearchResponse shapes how we'll return JSON to the caller.
type SearchResponse struct {
	Query        string          `json:"query"`
	Page         int             `json:"page"`
	PerPage      int             `json:"per_page"`
	TotalResults int             `json:"total_results"`
	ElapsedMs    float64         `json:"elapsed_ms"`
	Results      []search.Result `json:"results"`
}

// SearchHandler handles GET requests to /search.
func SearchHandler(w http.ResponseWriter, r *http.Request) {
	// Parse the query string
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Missing query parameter 'q'", http.StatusBadRequest)
		return
	}

	// Parse optional pagination parameters
	// Default page=1, per_page=10
	page := 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if val, err := strconv.Atoi(pageStr); err == nil && val > 0 {
			page = val
		}
	}

	perPage := 10
	if ppStr := r.URL.Query().Get("per_page"); ppStr != "" {
		if val, err := strconv.Atoi(ppStr); err == nil && val > 0 {
			perPage = val
		}
	}

	// Time the search for performance insight
	start := time.Now()
	results := search.ProcessQuery(query)
	elapsed := time.Since(start).Seconds() * 1000.0 // in ms

	total := len(results)
	startIndex := (page - 1) * perPage
	endIndex := startIndex + perPage

	// Guard against out-of-bounds
	if startIndex > total {
		startIndex = total
	}
	if endIndex > total {
		endIndex = total
	}

	pagedResults := results[startIndex:endIndex]

	// Construct our response object
	resp := SearchResponse{
		Query:        query,
		Page:         page,
		PerPage:      perPage,
		TotalResults: total,
		ElapsedMs:    elapsed,
		Results:      pagedResults,
	}

	// Encode to JSON
	w.Header().Set("Content-Type", "application/json")
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", " ") // optional: pretty-print
	if err := encoder.Encode(resp); err != nil {
		// If encoding fails, respond with an error
		http.Error(w, fmt.Sprintf("JSON encoding error: %v", err), http.StatusInternalServerError)
		return
	}
}
