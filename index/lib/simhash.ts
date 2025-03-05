const NUMBER_OF_BITS = 64;
const FRAGMENT_SIZE = 2;

type THash = bigint;

export function simhashTokens(fragments: string[]): THash {
	const hashVector = new Array(NUMBER_OF_BITS).fill(0);

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

export function simhashString(text: string): THash {
	const fragments = makeFragments(text);
	return simhashTokens(fragments);
}

function makeFragments(text: string) {
	let result: string[] = [];
	for (let i = 0; i < Math.max(text.length - FRAGMENT_SIZE + 1, 1); ++i)
		result.push(text.slice(i, i + FRAGMENT_SIZE));
	return result;
}
