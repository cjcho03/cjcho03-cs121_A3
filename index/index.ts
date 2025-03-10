import type { BunFile } from "bun";
import HTMLCleaner, { getTokenFrequency, isHtml, reencodeString } from "./html-tokenizer";
import type { WebsiteFile } from "./get-website";
import DoubleMap from "./lib/double-map";
import { type TokenFrequencyType } from "./html-tokenizer";
import { simhashString, simhashTokens } from "./lib/simhash";
import simhashStore from "./lib/simhash-store";

interface IndexEntry {
	documentId: number,
	occurrences: TokenFrequencyType
}

interface DirectoryEntry {
	keys: string[],
	indexFiles: string[]
}

interface TitleType {
	title: string,
	description?: string
}

type IndexType = Map<string, IndexEntry[]>;
type DocstoreType = DoubleMap<string, number>;
type TitleStoreType = Map<number, TitleType>;
type RankstoreType = Map<string, number>;

const LOW_INFORMATION_DOC_THRESHOLD = 10;

export class Index {
	id: number;
	tokens: string[];
	index: IndexType;
	documentStore: DocstoreType;

	constructor(fragmentId = -1) {
		this.index = new Map<string, IndexEntry[]>();
		this.documentStore = new DoubleMap<string, number>();
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
		const documentUrl = websiteFile.url;
		const documentId = this.documentStore.size;
		// Skip if the document is already parsed (in the document store)
		if (this.documentStore.getOne(documentUrl)) return;
		// Register this document into the docstore
		this.documentStore.set(documentUrl, documentId);
		// Tokenize the web page and get the token frequency\
		const tokenFrequencies = getTokenFrequency(HTMLCleaner.tokenize(HTMLCleaner.clean(websiteFile.content)));
		// For each token
		for (const token of tokenFrequencies.keys()) {
			const frequency = tokenFrequencies.get(token)!;
			// Create the index entry structure and add it to the index
			this.insertToken(token, { documentId: documentId, occurrences: frequency });
		}
	}

	insertToken(token: string, indexEntry: IndexEntry) {
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
		const sortedIndex = Array.from(this.index.entries()).sort((a, b) => {
			if (a[0] < b[0]) return -1;
			if (a[0] > b[0]) return 1;
			return 0;
		});

		return await Bun.write(indexFileName(this.id), JSON.stringify(Object.fromEntries(sortedIndex)));
	}

	async loadIndex() {
		const indexFile = Bun.file(indexFileName(this.id));
		const jsonIndex = await indexFile.json();
		this.index = new Map(Object.entries(jsonIndex));
		this.tokens = [...this.index.keys()].sort()
	}
}

export class IndexRouter {
	// childIndexes: Index[];
	numberOfIndexes: number;

	keys: string[];
	documentStore: DocstoreType = new DoubleMap();
	titleStore: TitleStoreType = new Map();
	pageRankStore: RankstoreType = new Map();

	constructor(numberOfIndexes = 1) {
		// this.childIndexes = [];
		this.keys = [];
		// for (let i = 0; i < numberOfIndexes; ++i) {
		// 	this.childIndexes.push(new Index(i))
		// }
		this.numberOfIndexes = numberOfIndexes;
	}

	async addDocument(file: BunFile): Promise<void> {
		const websiteFile: WebsiteFile = await file.json();
		const documentName = websiteFile.url;

		const documentId = this.documentStore.size;
		const documentContent = reencodeString(websiteFile.content, websiteFile.encoding);
		const documentTitle = HTMLCleaner.getTitle(documentContent);
		const documentDescription = HTMLCleaner.getDescription(documentContent);

		// Skip if the document is not valid HTML
		if (!await isHtml(documentContent)) return;

		// Skip if the document is already parsed (in the document store)
		if (this.documentStore.getOne(documentName)) return;
		// Tokenize the web page and get the token frequency
		const cleanHtml = HTMLCleaner.clean(documentContent);
		const tokens = HTMLCleaner.tokenize(cleanHtml);
		const outlinks = HTMLCleaner.extractLinks(cleanHtml);
		// Skip if the document is similar to one already parsed
		const websiteHash = simhashTokens(tokens.map(token => token.value));
		if (simhashStore.isDuplicate(websiteHash)) return;
		simhashStore.add(websiteHash);
		const tokenFrequencies = getTokenFrequency(tokens);
		// Skip if the document doesn't have much information
		if (tokenFrequencies.size < LOW_INFORMATION_DOC_THRESHOLD) return;
		// Register this document into the docstore and hashstore
		this.documentStore.set(documentName, documentId);
		// Add the document name if applicable
		this.titleStore.set(documentId, {
			title: documentTitle,
			description: documentDescription
		});
		// Add the outlinks
		outlinks.forEach(link => {
			const parsedLink = URL.parse(link)?.toString();
			if (parsedLink && isLinkValid(parsedLink)) {
				const rank = this.pageRankStore.get(parsedLink);
				if (rank)
					this.pageRankStore.set(parsedLink, rank + 1);
				else
					this.pageRankStore.set(parsedLink, 1);
			}
		});
		// For each token
		for (const token of tokenFrequencies.keys()) {
			const frequency = tokenFrequencies.get(token)!;
			// Create the index entry structure and add it to the appropriate index
			await this.addToken(token, { documentId: documentId, occurrences: frequency });
		}
	}

	async addToken(token: string, indexEntry: IndexEntry) {
		const indexChosen = await this.chooseInsertionIndex(token);
		const indexSmallest = await this.smallestIndex();
		const chosenIndex = await this.openPage(indexChosen);
		const smallestIndex = await this.openPage(indexSmallest);
		// Insert into the chosen child
		chosenIndex.insertToken(token, indexEntry);
		// Rebalance the tree
		const minLength = smallestIndex.index.size;
		if (chosenIndex.index.size > minLength + 1) {
			if (indexSmallest < indexChosen) {
				// If smallestIndex < chosenIndex, redistribute left all from chosen to smallest
				await this.redistributeLeft(indexChosen, indexSmallest);

			}
			else {
				// Else, restirbute right
				await this.redistributeRight(indexChosen, indexSmallest);
			}
		}
		await chosenIndex.saveIndex();
		await smallestIndex.saveIndex();
	}

	private async chooseInsertionIndex(token: string) {
		if (this.keys.length === 0) {
			sortedInsert(this.keys, token);
			return this.keys.length;
		}
		if (this.keys.length + 1 < this.numberOfIndexes) {
			let left = 0;
			let right = this.keys.length;

			while (left < right) {
				const mid = Math.floor((left + right) / 2);
				if (this.keys[mid] < token)
					left = mid + 1;
				else
					right = mid;
			}
			if (this.keys[left] === token)
				return left + 1;
			await this.redistributeRight(left + 1, this.keys.length + 1);
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

	private async smallestIndex() {
		let minLength = -1;
		for (let i = 0; i < this.numberOfIndexes; ++i) {
			const index = await this.openPage(i);
			if (minLength === -1 || index.index.size < (await this.openPage(minLength)).index.size) {
				minLength = i;
			}
		}
		return minLength;
	}

	private async redistributeLeft(currentIndexI: number, endIndexI: number) {
		if (currentIndexI <= endIndexI)
			return;
		const nextIndexI = currentIndexI - 1;
		const currentIndex = await this.openPage(currentIndexI);
		const nextIndex = await this.openPage(nextIndexI);
		// Remove the smallest token entry from this index and move it to the left one
		const smallestValueOfCurrent = currentIndex.smallestToken;
		currentIndex.removeToken(smallestValueOfCurrent.token);
		for (const docEntry of smallestValueOfCurrent.posting) {
			nextIndex.insertToken(smallestValueOfCurrent.token, docEntry);
		}
		// Update the key in the top-level
		const newSmallest = currentIndex.smallestToken;
		if (newSmallest)
			this.keys[nextIndexI] = newSmallest.token;
		// Continue redistribution
		await currentIndex.saveIndex();
		await nextIndex.saveIndex();
		await this.redistributeLeft(nextIndexI, endIndexI);
	}

	private async redistributeRight(currentIndexI: number, endIndexI: number) {
		if (currentIndexI >= endIndexI)
			return;
		const nextIndexI = currentIndexI + 1;
		const currentIndex = await this.openPage(currentIndexI);
		const nextIndex = await this.openPage(nextIndexI);
		// Remove the smallest token entry from this index and move it to the left one
		const largestValueOfCurrent = currentIndex.largestToken;
		currentIndex.removeToken(largestValueOfCurrent.token);
		for (const docEntry of largestValueOfCurrent.posting) {
			nextIndex.insertToken(largestValueOfCurrent.token, docEntry);
		}
		// Update the key in the top-level
		const newSmallest = nextIndex.smallestToken;
		if (newSmallest.token)
			this.keys[currentIndexI] = newSmallest.token;
		// Continue redistribution
		await currentIndex.saveIndex();
		await nextIndex.saveIndex();
		await this.redistributeRight(nextIndexI, endIndexI);
	}

	async saveIndex() {
		let sum = 0;
		for (let i = 0; i < this.numberOfIndexes; ++i) {
			const index = await this.openPage(i);
			sum += await index.saveIndex();
		}

		const indexFiles = [];
		for (let i = 0; i < this.numberOfIndexes; ++i) {
			indexFiles.push(indexFileName(i));
		}

		sum += await Bun.write("index_dir.json", JSON.stringify({
			keys: [...this.keys],
			indexFiles: indexFiles
		}));

		let documents: any = {};
		for (const key of this.documentStore.mapTwo.keys()) {
			documents[key] = {
				url: this.documentStore.getTwo(key),
				title: this.titleStore.get(key)?.title,
				description: this.titleStore.get(key)?.description
			}
		}

		sum += await Bun.write("docs.json", JSON.stringify(documents));

		const sortedIndex = Array.from(this.pageRankStore.entries()).sort((a, b) => {
			if (a[1] < b[1]) return -1;
			if (a[1] > b[1]) return 1;
			return 0;
		}).reverse();

		sum += await Bun.write("ranks.json", JSON.stringify(Object.fromEntries(sortedIndex)));

		return sum;
	}

	async loadIndex() {
		const docstoreFile = Bun.file("docs.json");
		const jsonDocs = await docstoreFile.json();
		this.documentStore = new DoubleMap();
		for (const [key, value] of new Map<string, string>(Object.entries(jsonDocs))) {
			this.documentStore.set(key, parseInt(value));
		}

		const rankStore = Bun.file("ranks.json");
		const jsonRanks = await rankStore.json();
		for (const [key, value] of new Map<string, string>(Object.entries(jsonRanks))) {
			this.pageRankStore.set(key, parseInt(value));
		}


		const routerFile = Bun.file("index_dir.json");
		const jsonRouter: DirectoryEntry = await routerFile.json();
		this.keys = [...jsonRouter.keys];
	}

	async openPage(pageNumber: number) {
		const index = new Index(pageNumber);
		await index.loadIndex();
		return index;
	}
}

interface SearchDocStoreEntry {
	url: string,
	title: string,
	description: string
}

export class SearchIndex {
	keys: string[];
	indexes: string[];
	currentIndex: Index | undefined;
	documentStore: Map<number, SearchDocStoreEntry> = new Map();

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
		console.log(tokens)
		const startTime = performance.now();

		let result = [];
		let queryResult = await Promise.all(tokens
			.map(token => this.queryToken(token)
				.then(documents => (documents || []))
			)
		);
		console.log(`${performance.now() - startTime}ms`);
		queryResult = queryResult.sort((a, b) => a.length - b.length);
		return queryResult.reduce((accumulator, currentResult) => accumulator
			.filter(accIndexEntry =>
				currentResult.some(curIndexEntry => curIndexEntry.documentId === accIndexEntry.documentId)))
			.map(accIndexEntry => `Title: ${this.documentStore.get(accIndexEntry.documentId)?.title}, URL: ${this.documentStore.get(accIndexEntry.documentId)?.url}, Score: ${accIndexEntry.occurrences.textCount + accIndexEntry.occurrences.headerCount}`)
			.slice(-5).reverse();
	}

	async loadDocIds() {
		const docstoreFile = Bun.file("docs.json");
		const jsonDocs = await docstoreFile.json();
		this.documentStore = new Map();
		for (const [key, value] of new Map<string, SearchDocStoreEntry>(Object.entries(jsonDocs))) {
			this.documentStore.set(parseInt(key), {
				url: value.url,
				title: value.title,
				description: value.description
			});
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

function isLinkValid(link: string) {
	const invalidExtensionsRegex = /\.(css|js|bmp|gif|jpg|jpeg|png|mp4|mp3|zip|rar|gz|pdf|doc|docx|ppt|pptx|tar|txt)$/i;
	const permittedDomains = ['ics.uci.edu', 'cs.uci.edu', 'informatics.uci.edu', 'stat.uci.edu'];

	const parsedUrl = new URL(link);
	const isHttp = parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
	const isInDomain = permittedDomains.some(domain => parsedUrl.hostname.includes(domain));
	const isValidExtension = !invalidExtensionsRegex.test(parsedUrl.href.toLowerCase());

	return isHttp && isInDomain && isValidExtension;
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
