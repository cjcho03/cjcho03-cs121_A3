import getWebsites from "./get-website"
import index from "./index";
import { numberOfIndexedDocuments, numberOfUniqueWords, sizeOfIndex } from "./report"

if (!Bun.argv.includes("--restart"))
	await index.loadIndex();
// Retrieve the websites
const websites = await getWebsites();
// Tokenize HTML inside files
// let i = 0;
for (const website of websites) {
	// ++i;
	// console.log(`Adding document ${i}/${websites.length}`);
	await index.addDocument(website);
}
await index.saveIndex();
// Report
// 1. Number of indexed documents
// 2. Number of unique words
// 3. Total size of the index on disk (kB)
console.log(numberOfIndexedDocuments());
console.log(numberOfUniqueWords());
console.log(await sizeOfIndex());
// 1. 55393
// 2. 270274
// 3. 64475.3603515625

// 2m3s
// 2m2s