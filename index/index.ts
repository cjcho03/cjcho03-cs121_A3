import type { BunFile } from "bun";
import HTMLCleaner, { getTokenFrequency } from "./html-tokenizer";
import type { WebsiteFile } from "./get-website";
import DoubleMap from "./lib/double-map";
import { type TokenFrequencyType } from "./html-tokenizer";

interface IndexEntry {
	documentId: number,
	occurrences: TokenFrequencyType
}

interface DirectoryEntry {
	keys: string[],
	indexFiles: string[]
}

type IndexType = Map<string, IndexEntry[]>;
type DocstoreType = DoubleMap<string, number>;

// Will this eventually need to become a B+ tree?
// We'll see
class Index {
	id: number;
	tokens: string[];
	index: IndexType;
	documentStore: DocstoreType;

	constructor(fragmentId = -1) {
		this.index = new Map<string, IndexEntry[]>();
		this.documentStore = new DoubleMap<string, number>;
		this.id = fragmentId;
		this.tokens = [];
	}

	get smallestToken() {
		return {
			token: this.tokens[0],
			posting: this.index.get(this.tokens[0])!
		};
	}

	get largestToken() {
		return {
			token: this.tokens[this.tokens.length - 1],
			posting: this.index.get(this.tokens[this.tokens.length - 1])!
		}
	}

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
			this.insertToken(documentId, frequency, token);
		}
	}

	insertToken(documentId: number, frequency: TokenFrequencyType, token: string) {
		const indexEntry = {
			documentId: documentId,
			occurrences: frequency
		};
		const currentEntry = this.index.get(token);
		if (currentEntry)
			currentEntry.push(indexEntry);
		else {
			this.index.set(token, [indexEntry]);
			// Insert the token to the list of tokens
			sortedInsert(this.tokens, token);
		}

	}

	removeToken(token: string) {
		this.index.delete(token);
		sortedErase(this.tokens, token);
	}

	async saveIndex() {
		return await Bun.write(indexFileName(this.id), JSON.stringify(Object.fromEntries(this.index)))
			+ await Bun.write("docs.json", JSON.stringify(Object.fromEntries(this.documentStore.mapOne)));
	}

	async loadIndex() {
		const indexFile = Bun.file(indexFileName(this.id));
		const jsonIndex = await indexFile.json();
		this.index = new Map(Object.entries(jsonIndex));
		this.tokens = [...this.index.keys()].sort()
	}
}

export class IndexRouter {
	childIndexes: Index[];
	keys: string[];
	documentStore: DocstoreType = new DoubleMap();

	constructor(numberOfIndexes = 1) {
		this.childIndexes = [];
		this.keys = [];
		for (let i = 0; i < numberOfIndexes; ++i) {
			this.childIndexes.push(new Index(i))
		}
	}

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
			// Create the index entry structure and add it to the appropriate index
			this.addToken(documentId, frequency, token);
		}
	}

	addToken(documentId: number, frequency: TokenFrequencyType, token: string) {
		const indexEntry = {
			documentId: documentId,
			occurrences: frequency
		};
		const indexChosen = this.chooseInsertionIndex(token);
		const indexSmallest = this.smallestIndex();
		const chosenIndex = this.childIndexes[indexChosen];
		const smallestIndex = this.childIndexes[indexSmallest];
		// Insert into the chosen child
		chosenIndex.insertToken(indexEntry.documentId, indexEntry.occurrences, token);
		// Rebalance the tree
		const minLength = smallestIndex.index.size;
		if (chosenIndex.index.size > minLength + 1) {
			if (indexSmallest < indexChosen) {
				// If smallestIndex < chosenIndex, redistribute left all from chosen to smallest
				this.redistributeLeft(indexChosen, indexSmallest);

			}
			else {
				// Else, restirbute right
				this.redistributeRight(indexChosen, indexSmallest);
			}
		}
	}

	private chooseInsertionIndex(token: string) {
		if (this.keys.length === 0) {
			sortedInsert(this.keys, token);
			return this.keys.length;
		}
		if (this.keys.length + 1 < this.childIndexes.length) {
			let left = 0;
			let right = this.keys.length;

			while (left < right) {
				const mid = Math.floor((left + right) / 2);
				if (this.keys[mid] < token)
					left = mid + 1;
				else
					right = mid;
			}
			this.redistributeRight(left + 1, this.keys.length + 1);
			this.keys[left] = token;
			return left + 1;
		}
		let indexI = 0;
		for (const key of this.keys) {
			if (key <= token)
				++indexI;
		}
		return indexI;
	}

	private smallestIndex() {
		let minLength = -1;
		for (let i = 0; i < this.childIndexes.length; ++i) {
			const index = this.childIndexes[i];
			if (minLength === -1 || index.index.size < this.childIndexes[minLength].index.size) {
				minLength = i;
			}
		}
		return minLength;
	}

	private redistributeLeft(currentIndexI: number, endIndexI: number) {
		if (currentIndexI <= endIndexI)
			return;
		const nextIndexI = currentIndexI - 1;
		const currentIndex = this.childIndexes[currentIndexI];
		const nextIndex = this.childIndexes[nextIndexI];
		// Remove the smallest token entry from this index and move it to the left one
		const smallestValueOfCurrent = currentIndex.smallestToken;
		currentIndex.removeToken(smallestValueOfCurrent.token);
		for (const docEntry of smallestValueOfCurrent.posting) {
			nextIndex.insertToken(docEntry.documentId, docEntry.occurrences, smallestValueOfCurrent.token);
		}
		// Update the key in the top-level
		const newSmallest = currentIndex.smallestToken;
		if (newSmallest)
			this.keys[nextIndexI] = newSmallest.token;
		// Continue redistribution
		this.redistributeLeft(nextIndexI, endIndexI);
	}

	private redistributeRight(currentIndexI: number, endIndexI: number) {
		if (currentIndexI >= endIndexI)
			return;
		const nextIndexI = currentIndexI + 1;
		const currentIndex = this.childIndexes[currentIndexI];
		const nextIndex = this.childIndexes[nextIndexI];
		// Remove the smallest token entry from this index and move it to the left one
		const largestValueOfCurrent = currentIndex.largestToken;
		currentIndex.removeToken(largestValueOfCurrent.token);
		for (const docEntry of largestValueOfCurrent.posting) {
			nextIndex.insertToken(docEntry.documentId, docEntry.occurrences, largestValueOfCurrent.token);
		}
		// Update the key in the top-level
		const newSmallest = nextIndex.smallestToken;
		if (newSmallest.token)
			this.keys[currentIndexI] = newSmallest.token;
		// Continue redistribution
		this.redistributeRight(nextIndexI, endIndexI);
	}

	async saveIndex() {
		let sum = 0;
		for (const index of this.childIndexes) {
			sum += await index.saveIndex();
		}
		sum += await Bun.write("index_dir.json", JSON.stringify({
			keys: [...this.keys],
			indexFiles: [...this.childIndexes.map(c => indexFileName(c.id))]
		}));
		sum += await Bun.write("docs.json", JSON.stringify(Object.fromEntries(this.documentStore.mapOne)));
		return sum;
	}

	async loadIndex() {
		const docstoreFile = Bun.file("docs.json");
		const jsonDocs = await docstoreFile.json();
		this.documentStore = new DoubleMap();
		for (const [key, value] of new Map<string, string>(Object.entries(jsonDocs))) {
			this.documentStore.set(key, parseInt(value));
		}

		for (const index of this.childIndexes) {
			await index.loadIndex();
		}

		const routerFile = Bun.file("index_dir.json");
		const jsonRouter: DirectoryEntry = await routerFile.json();
		this.keys = [...jsonRouter.keys];
	}
}

export class SearchIndex {
	keys: string[];
	indexes: string[];
	currentIndex: Index | undefined;
	documentStore: DocstoreType = new DoubleMap();

	constructor(directory: DirectoryEntry) {
		this.keys = [...directory.keys];
		this.indexes = [...directory.indexFiles];
		this.currentIndex = undefined;
	}

	/** Get the list of DocIDs associated with the token, sorted by occurrences
	 *
	 */
	async queryToken(token: string) {
		let i = 0;
		for (; i < this.keys.length; ++i) {
			const cmpKey = this.keys[i];
			if (token < cmpKey) {
				break;
			}
		}
		const index = new Index(i);
		await index.loadIndex();
		const entries = index.index.get(token);
		return entries?.sort((a, b) => a.occurrences.textCount - b.occurrences.textCount);
	}

	async query(...tokens: string[]) {
		const startTime = performance.now();

		let result = [];
		let queryResult = await Promise.all(tokens
			.map(token => this.queryToken(token)
				.then(documents => (documents || []))
			)
		);
		console.log(`${performance.now() - startTime}ms`);
		queryResult = queryResult.sort((a, b) => a.length - b.length);
		const documents = new Map<number, number>();
		return queryResult.reduce((accumulator, currentResult) => accumulator
			.filter(accIndexEntry =>
				currentResult.some(curIndexEntry => curIndexEntry.documentId === accIndexEntry.documentId)))
			.map(accIndexEntry => `URL: ${this.documentStore.getTwo(accIndexEntry.documentId)}, Score: ${accIndexEntry.occurrences.textCount + accIndexEntry.occurrences.headerCount}`)
			.slice(-5).reverse();
	}

	async loadDocIds() {
		const docstoreFile = Bun.file("docs.json");
		const jsonDocs = await docstoreFile.json();
		this.documentStore = new DoubleMap();
		for (const [key, value] of new Map<string, string>(Object.entries(jsonDocs))) {
			this.documentStore.set(key, parseInt(value));
		}
	}

	static async getDirectory() {
		const routerFile = Bun.file("index_dir.json");
		return await routerFile.json();
	}
}

function indexFileName(fragmentNumber = -1) {
	if (fragmentNumber <= -1) return "index.json"
	return `index_${fragmentNumber}.json`;
}

function sortedInsert<T>(list: T[], value: T) {
	// Binary search insertion index
	let left = 0;
	let right = list.length;

	while (left < right) {
		const mid = Math.floor((left + right) / 2);
		if (list[mid] < value)
			left = mid + 1;
		else
			right = mid;
	}

	list.splice(left, 0, value);
}

function sortedErase<T>(list: T[], value: T) {
	let left = 0;
	let right = list.length;
	let index = -1;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		if (list[mid] === value) {
			index = mid;
			break;
		}
		else if (list[mid] < value)
			left = mid + 1;
		else
			right = mid - 1;
	}

	if (index !== -1)
		list.splice(index, 1);
}

export default new Index();
