import getWebsites from "./get-website"
import { IndexRouter } from "./index";
import { RoutedIndexReporter } from "./report"

const NUMBER_OF_INDEX_FRAGMENTS = 300;

const index = new IndexRouter(NUMBER_OF_INDEX_FRAGMENTS);
const reporter = new RoutedIndexReporter(index);
if (!Bun.argv.includes("--restart"))
	await index.loadIndex();
// Retrieve the websites
const websites = await getWebsites();
// Add a website to the index
// for (let i = 0; i < 10; ++i) {
// const website = websites[i];
for (const website of websites) {
	await index.addDocument(website);
}
await index.saveIndex();
// Report
// 1. Number of indexed documents
// 2. Number of unique words
// 3. Total size of the index on disk (kB)
console.log(`Indexed documents: ${reporter.numberOfIndexedDocuments()}`);
console.log(`Unique words: ${reporter.numberOfUniqueWords()}`);
console.log(`Index size: ${await reporter.sizeOfIndex()} kB`);
// 1. 55393
// 2. 270274
// 3. 64475.3603515625

// 2m3s
// 2m2s
