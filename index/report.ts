import index, { IndexRouter } from "./index";

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

	numberOfUniqueWords() {
		return this.index.childIndexes.reduce((acc, cur) => acc += cur.tokens.length, 0);
	}

	async sizeOfIndex() {
		return await this.index.saveIndex();
	}
}
