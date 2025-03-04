const NUMBER_OF_BITS = 64;
const FRAGMENT_SIZE = 2;

type THash = bigint;

const simhashStore = new Set<bigint>();

export function simhashString(text: string): THash {
	const hashVector = new Array(NUMBER_OF_BITS).fill(0);
	const fragments = makeFragments(text);

	for (const fragment of fragments) {
		const hashedFragment: bigint = Bun.hash.murmur64v2(fragment);
		for (let i = 0; i < NUMBER_OF_BITS; i++) {
			if (hashedFragment & (1n << BigInt(i)))
				++hashVector[i];
			else
				--hashVector[i];
		}
	}

	let fingerprint = 0n;
	for (let i = 0; i < NUMBER_OF_BITS; i++) {
		if (hashVector[i] > 0) {
			fingerprint |= (1n << BigInt(i));
		}
	}

	return fingerprint;
}

function makeFragments(text: string) {
	let result: string[] = [];
	for (let i = 0; i < Math.max(text.length - FRAGMENT_SIZE + 1, 1); ++i)
		result.push(text.slice(i, i + FRAGMENT_SIZE));
	return result;
}

function simhashSimilar(rHash: THash, lHash: THash, simThreshold = 0.75) {
	let numberOfDifferentBits = 0;
	let xorResult = rHash ^ lHash;
	while (xorResult > 0n) {
		if (xorResult & 1n) {
			++numberOfDifferentBits;
		}
		xorResult >>= 1n;
	}
	const similarity = 1 - (numberOfDifferentBits / NUMBER_OF_BITS);
	return similarity >= simThreshold;
}

export function simhashStoreAddIfNew(hashValue: THash): boolean {
	for (const storedHash of simhashStore) {
		if (simhashSimilar(hashValue, storedHash)) {
			simhashStore.add(hashValue);
			return false;
		}
	}
	simhashStore.add(hashValue);
	return true;
}