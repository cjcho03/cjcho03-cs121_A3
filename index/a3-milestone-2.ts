import { IndexRouter, SearchIndex } from "./index";
import { tokenize } from "./html-tokenizer";

const queries = [
    "Iftekhar Ahmed",
    "machine learning",
    "ACM",
    "master of software engineering"
];

const prompt = "Search: ";

const index = new SearchIndex(await SearchIndex.getDirectory());
await index.loadDocIds();
process.stdout.write(prompt);

for await (const line of console) {
    console.log(`You typed: ${line}`);
    const res = await index.query(...tokenize(line).map(t => t.value))
    console.log(res);
    process.stdout.write(prompt);
}
