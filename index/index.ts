import type { BunFile } from "bun";
import HTMLCleaner, { getTokenFrequency } from "./html-tokenizer";
import type { WebsiteFile } from "./get-website";
import DoubleMap from "./lib/double-map";
import { type TokenFrequencyType } from "./html-tokenizer";

interface IndexEntry {
	documentId: number,
	occurrences: TokenFrequencyType
}

type IndexType = Map<string, IndexEntry[]>;
type DocstoreType = DoubleMap<string, number>;

// Will this eventually need to become a B+ tree?
// We'll see
class Index {
	index: IndexType = new Map();
	documentStore: DocstoreType = new DoubleMap();

	async addDocument(file: BunFile): Promise<void> {
		const websiteFile: WebsiteFile = await file.json();
		const documentName = websiteFile.url;
		const documentId = this.documentStore.size;
		// Skip if the document is already parsed (in the document store)
		if (this.documentStore.getOne(documentName)) return;
		// Register this document into the docstore
		this.documentStore.set(documentName, documentId);
		// Tokenize the web page and get the token frequency
		const tokenFrequencies = getTokenFrequency(HTMLCleaner.tokenize(HTMLCleaner.clean(websiteFile.content)));
		// For each token
		for (const token of tokenFrequencies.keys()) {
			const frequency = tokenFrequencies.get(token)!;
			// Create the index entry structure and add it to the index
			const indexEntry = {
				documentId: documentId,
				occurrences: frequency
			};
			const currentEntry = this.index.get(token);
			if (currentEntry)
				currentEntry.push(indexEntry);
			else
				this.index.set(token, [indexEntry]);
		}
	}

	async saveIndex() {
		return await Bun.write("index.json", JSON.stringify(Object.fromEntries(this.index)))
			+ await Bun.write("docs.json", JSON.stringify(Object.fromEntries(this.documentStore.mapOne)));
	}

	async loadIndex() {
		const indexFile = Bun.file("index.json");
		const jsonIndex = await indexFile.json();
		this.index = new Map(Object.entries(jsonIndex));

		const docstoreFile = Bun.file("docs.json");
		const jsonDocs = await docstoreFile.json();
		this.documentStore = new DoubleMap();
		for (const [key, value] of new Map<string, string>(Object.entries(jsonDocs))) {
			this.documentStore.set(key, parseInt(value));
		}
	}
}

export default new Index();
