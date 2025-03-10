import { stemmer } from "stemmer";

const REG_IS_ALPHANUMERIC = new RegExp("[^a-z0-9]+");
const STOPWORDS = new Set(["a", "able", "about", "above", "abst", "accordance", "according", "accordingly", "across", "act", "actually", "added", "adj", "affected", "affecting", "affects", "after", "afterwards", "again", "against", "ah", "all", "almost", "alone", "along", "already", "also", "although", "always", "am", "among", "amongst", "an", "and", "announce", "another", "any", "anybody", "anyhow", "anymore", "anyone", "anything", "anyway", "anyways", "anywhere", "apparently", "approximately", "are", "aren", "arent", "arise", "around", "as", "aside", "ask", "asking", "at", "auth", "available", "away", "awfully", "b", "back", "be", "became", "because", "become", "becomes", "becoming", "been", "before", "beforehand", "begin", "beginning", "beginnings", "begins", "behind", "being", "believe", "below", "beside", "besides", "between", "beyond", "biol", "both", "brief", "briefly", "but", "by", "c", "ca", "came", "can", "cannot", "t", "cause", "causes", "certain", "certainly", "co", "com", "come", "comes", "contain", "containing", "contains", "could", "couldnt", "d", "date", "did", "didn", "different", "do", "does", "doesn", "doing", "done", "don", "down", "downwards", "due", "during", "e", "each", "ed", "edu", "effect", "eg", "eight", "eighty", "either", "else", "elsewhere", "end", "ending", "enough", "especially", "et", "et-al", "etc", "even", "ever", "every", "everybody", "everyone", "everything", "everywhere", "ex", "except", "f", "far", "few", "ff", "fifth", "first", "five", "fix", "followed", "following", "follows", "for", "former", "formerly", "forth", "found", "four", "from", "further", "furthermore", "g", "gave", "get", "gets", "getting", "give", "given", "gives", "giving", "go", "goes", "gone", "got", "gotten", "h", "had", "happens", "hardly", "has", "hasn", "have", "haven", "having", "he", "hed", "hence", "her", "here", "hereafter", "hereby", "herein", "heres", "hereupon", "hers", "herself", "hes", "hi", "hid", "him", "himself", "his", "hither", "home", "how", "howbeit", "however", "hundred", "i", "id", "ie", "if", "ll", "im", "immediate", "immediately", "importance", "important", "in", "inc", "indeed", "index", "information", "instead", "into", "invention", "inward", "is", "isn", "it", "itd", "its", "itself", "ve", "j", "just", "k", "keep ", "keeps", "kept", "kg", "km", "know", "known", "knows", "l", "largely", "last", "lately", "later", "latter", "latterly", "least", "less", "lest", "let", "lets", "like", "liked", "likely", "line", "little", "look", "looking", "looks", "ltd", "m", "made", "mainly", "make", "makes", "many", "may", "maybe", "me", "mean", "means", "meantime", "meanwhile", "merely", "mg", "might", "million", "miss", "ml", "more", "moreover", "most", "mostly", "mr", "mrs", "much", "mug", "must", "my", "myself", "n", "na", "name", "namely", "nay", "nd", "near", "nearly", "necessarily", "necessary", "need", "needs", "neither", "never", "nevertheless", "new", "next", "nine", "ninety", "no", "nobody", "non", "none", "nonetheless", "noone", "nor", "normally", "nos", "not", "noted", "nothing", "now", "nowhere", "o", "obtain", "obtained", "obviously", "of", "off", "often", "oh", "ok", "okay", "old", "omitted", "on", "once", "one", "ones", "only", "onto", "or", "ord", "other", "others", "otherwise", "ought", "our", "ours", "ourselves", "out", "outside", "over", "overall", "owing", "own", "p", "page", "pages", "part", "particular", "particularly", "past", "per", "perhaps", "placed", "please", "plus", "poorly", "possible", "possibly", "potentially", "pp", "predominantly", "present", "previously", "primarily", "probably", "promptly", "proud", "provides", "put", "q", "que", "quickly", "quite", "qv", "r", "ran", "rather", "rd", "re", "readily", "really", "recent", "recently", "ref", "refs", "regarding", "regardless", "regards", "related", "relatively", "research", "respectively", "resulted", "resulting", "results", "right", "run", "s", "said", "same", "saw", "say", "saying", "says", "sec", "section", "see", "seeing", "seem", "seemed", "seeming", "seems", "seen", "self", "selves", "sent", "seven", "several", "shall", "she", "shed", "shes", "should", "shouldn", "show", "showed", "shown", "showns", "shows", "significant", "significantly", "similar", "similarly", "since", "six", "slightly", "so", "some", "somebody", "somehow", "someone", "somethan", "something", "sometime", "sometimes", "somewhat", "somewhere", "soon", "sorry", "specifically", "specified", "specify", "specifying", "still", "stop", "strongly", "sub", "substantially", "successfully", "such", "sufficiently", "suggest", "sup", "sure ", "take", "taken", "taking", "tell", "tends", "th", "than", "thank", "thanks", "thanx", "that", "thats", "the", "their", "theirs", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "thered", "therefore", "therein", "thereof", "therere", "theres", "thereto", "thereupon", "these", "they", "theyd", "theyre", "think", "this", "those", "thou", "though", "thoughh", "thousand", "throug", "through", "throughout", "thru", "thus", "til", "tip", "to", "together", "too", "took", "toward", "towards", "tried", "tries", "truly", "try", "trying", "ts", "twice", "two", "u", "un", "under", "unfortunately", "unless", "unlike", "unlikely", "until", "unto", "up", "upon", "ups", "us", "use", "used", "useful", "usefully", "usefulness", "uses", "using", "usually", "v", "value", "various", "very", "via", "viz", "vol", "vols", "vs", "w", "want", "wants", "was", "wasnt", "way", "we", "wed", "welcome", "went", "were", "werent", "what", "whatever", "whats", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "wheres", "whereupon", "wherever", "whether", "which", "while", "whim", "whither", "who", "whod", "whoever", "whole", "whom", "whomever", "whos", "whose", "why", "widely", "willing", "wish", "with", "within", "without", "wont", "words", "world", "would", "wouldnt", "www", "x", "y", "yes", "yet", "you", "youd", "your", "youre", "yours", "yourself", "yourselves", "z", "zero"]);

interface TokenizerOptions {
	isHeader?: boolean,
	isEmphasized?: boolean
}

export interface TokenType {
	value: string,
	isHeader: boolean,
	isEmphasized: boolean
}

export interface TokenFrequencyType {
	textCount: number,
	headerCount: number,
	importantCount: number
}

export type TokenFrequencyMap = Map<string, TokenFrequencyType>;

const HTMLCleaner = {
	getTitle(htmlString: string) {
		let result = "";
		new HTMLRewriter()
			.on("title, h1", {
				text(title) {
					if (!result) {
						result = title.text.replaceAll("\n", "").trim();
					}
				}
			})
			.transform(htmlString);
		return result;
	},
	getDescription(htmlString: string) {
		let result = "";
		new HTMLRewriter()
			.on("meta", {
				element(meta) {
					if (meta.getAttribute("name") === "description") {
						result = meta.getAttribute("content") || "";
					}
				}
			})
			.transform(htmlString);
		return result;
	},
	clean(htmlString: string) {
		return new HTMLRewriter()
			.on("script", {
				element(script) {
					script.remove();
				}
			})
			.on("head", {
				element(head) {
					head.remove();
				}
			})
			.on("*", {
				comments(comment) {
					comment.remove();
				}
			})
			.transform(htmlString);
	},
	extractLinks(htmlString: string) {
		const result: string[] = [];
		new HTMLRewriter()
		.on("a", {
			element(hyperlink) {
				const ref = hyperlink.getAttribute("href");
				if (ref)
					result.push(ref);
			}
		})
		.transform(htmlString);
		return result
	},
	tokenize(htmlString: string) {
		const tokens: TokenType[] = []
		new HTMLRewriter()
			.on("h1, h2, h3, h4, h5, h6", {
				text(heading) {
					const headingText = heading.text.toLowerCase().trim();
					if (headingText) tokens.push(...tokenize(headingText, { isHeader: true }))
				}
			})
			.on("em, strong, b, i", {
				text(emphasized) {
					const importantText = emphasized.text.toLowerCase().trim();
					if (importantText) tokens.push(...tokenize(importantText, { isEmphasized: true }))
				}
			})
			.on("*", {
				text(element) {
					const text = element.text;
					if (text) tokens.push(...tokenize(text));
				}
			}).transform(htmlString);
		return tokens;
	}
};

export function tokenize(textContent: string, options?: TokenizerOptions): TokenType[] {
	const isHeader = options?.isHeader || false;
	const isEmphasized = options?.isEmphasized || false;
	return textContent.toLowerCase().trim().split(REG_IS_ALPHANUMERIC)
		.map(token => stemmer(token))
		.filter(token => token.length > 0)
		.map(token => ({
			value: token,
			isHeader: isHeader,
			isEmphasized: isEmphasized
		}));
}

export function getTokenFrequency(tokens: TokenType[]): TokenFrequencyMap {
	const result: TokenFrequencyMap = new Map<string, TokenFrequencyType>();
	for (const token of tokens) {
		let frequency = result.get(token.value);
		if (!frequency) {
			frequency = {
				textCount: 0,
				headerCount: 0,
				importantCount: 0
			}
		}
		if (token.isHeader)
			++frequency.headerCount;
		else if (token.isEmphasized)
			++frequency.importantCount;
		else
			++frequency.textCount;
		result.set(token.value, frequency);
	}
	return result;
}

export async function isHtml(htmlString: string): Promise<boolean> {
	// Check for HTML tags
	const htmlIndicators = [
		/<html/i,
		/<body/i,
		/<div/i,
		/<p>/i,
		/<script/i,
		/<style/i
	];

	const hasHtmlPatterns = htmlIndicators.some(pattern =>
		pattern.test(htmlString)
	);
	if (hasHtmlPatterns) {
		return true;
	}
	return false;
}

export function reencodeString(inputString: string, encoding = "utf-8"): string {
	if (encoding === "utf-8")
		return inputString;
	try {
		const encoder = new TextEncoder();
		const decoder = new TextDecoder(encoding);
		return decoder.decode(encoder.encode(inputString));
	}
	catch (e) {
		return inputString;
	}
}

export default HTMLCleaner;
