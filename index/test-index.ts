import { IndexRouter, Index } from "./index";
import getWebsites, { type WebsiteFile } from "./get-website"
import { RoutedIndexReporter } from "./report";

const NUMBER_OF_INDEX_FRAGMENTS = 300;

const index = new IndexRouter(NUMBER_OF_INDEX_FRAGMENTS);
const reporter = new RoutedIndexReporter(index);

const websites = await getWebsites();
// Add a website to the index
for (let i = 0; i < NUMBER_OF_INDEX_FRAGMENTS; ++i) {
	await new Index(i).saveIndex();
}
for (let i = 0; i < 10; ++i) {
	const website = websites[i];
	console.log(`Parsing ${i}`)
	await index.addDocument(website);
}

console.log(`Indexed documents: ${reporter.numberOfIndexedDocuments()}`);
console.log(`Unique words: ${await reporter.numberOfUniqueWords()}`);
console.log(`Index size: ${await reporter.sizeOfIndex()} kB`);
