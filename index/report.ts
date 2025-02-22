import index from "./index";

export function numberOfIndexedDocuments(): number {
	return index.documentStore.size;
}

export function numberOfUniqueWords(): number {
	return index.index.size;
}

export async function sizeOfIndex(): Promise<number> {
	return await index.saveIndex() / 1024;
}