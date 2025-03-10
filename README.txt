-- CS121 Assignment 3 --
- Search Engine -

-- Project Structure --
backend/ # Backend server for search engine
	indexdir/ # Index files 
frontend/ # Server files serving frontend
index/ # Indexing script

-- Index creation -- 
Requirements: bun.js
Install required packages with `bun i` in the project's root directory
Run the indexer with `bun run index/make-index.ts`
The resulting files must be moved to backend/indexdir to use them with the web-based search engine, or in the current working directory for use with the CLI debugging search engine.

-- Running the search engine --
Requirements: Angular, npm, Go
From the `backend` directory, compile the backend with `go build -o <executable name> ./cmd/.`
Execute the resulting executable to run the webserver for the search API.
Install the required packages from the `frontend` directory with `bun i` (or its npm equivalent)
Serve the frontend with `ng serve`.