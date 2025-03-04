import { type WebsiteFile } from "./get-website"
import HTMLCleaner, { getTokenFrequency } from "./html-tokenizer";

const website = Bun.file("./developer/DEV/aiclub_ics_uci_edu/8ef6d99d9f9264fc84514cdd2e680d35843785310331e1db4bbd06dd2b8eda9b.json");
const websiteObject: WebsiteFile = await website.json();
console.log(getTokenFrequency(HTMLCleaner.tokenize(HTMLCleaner.clean(websiteObject.content))))
