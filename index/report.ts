import index, { IndexRouter, Index } from "./index";

export function numberOfIndexedDocuments(): number {
	return index.documentStore.size;
}

export function numberOfUniqueWords(): number {
	return index.index.size;
}

export async function sizeOfIndex(): Promise<number> {
	return await index.saveIndex() / 1024;
}

export class RoutedIndexReporter {
	index: IndexRouter;

	constructor(ir: IndexRouter) {
		this.index = ir;
	}

	numberOfIndexedDocuments() {
		return this.index.documentStore.size;
	}

	async numberOfUniqueWords() {
		let result = 0;
		for (let i = 0; i < this.index.numberOfIndexes; ++i) {
			const index = new Index(i);
			await index.loadIndex();
			result += index.tokens.length;
		}
		return result;
	}

	async sizeOfIndex() {
		return await this.index.saveIndex();
	}
}
