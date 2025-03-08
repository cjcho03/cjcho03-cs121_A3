import { IndexRouter } from ".";
import getWebsites, { type WebsiteFile } from "./get-website"
import { RoutedIndexReporter } from "./report";

const NUMBER_OF_INDEX_FRAGMENTS = 300;

const index = new IndexRouter(NUMBER_OF_INDEX_FRAGMENTS);
const reporter = new RoutedIndexReporter(index);

const websites = await getWebsites();
// Add a website to the index
for (let i = 0; i < 10; ++i) {
const website = websites[i];
// for (const website of websites) {
	await index.addDocument(website);
}

console.log(`Indexed documents: ${reporter.numberOfIndexedDocuments()}`);
console.log(`Unique words: ${reporter.numberOfUniqueWords()}`);
console.log(`Index size: ${await reporter.sizeOfIndex()} kB`);
