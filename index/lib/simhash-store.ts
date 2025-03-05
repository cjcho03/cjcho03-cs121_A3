export type SimHashValue = bigint;

export class SimHashStore {
    hammingDistanceThreshold = 3;
    allHashes = new Set<SimHashValue>();

    /**
     * Adds a hash to the store
     *
     * @param hash SimHash value to add
     * @returns true if added as new, false if detected as duplicate
     */
    add(hash: SimHashValue): boolean {
        // Check for exact duplicates first
        if (this.allHashes.has(hash) || this.isDuplicate(hash)) {
            return false;
        }

        // Add to the set of all hashes
        this.allHashes.add(hash);

        return true;
    }

    /**
     * Checks if a hash is a duplicate of any hash in the store
     *
     * @param hash SimHash value to check
     * @returns true if duplicate, false otherwise
     */
    isDuplicate(hash: SimHashValue): boolean {
        // Check Hamming distance for each candidate
        for (const candidate of this.allHashes) {
            if (this.hammingDistance(hash, candidate) <= this.hammingDistanceThreshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calculates Hamming distance between two SimHash values
     */
    private hammingDistance(hash1: SimHashValue, hash2: SimHashValue): number {
        // XOR the hashes to get bits that differ
        const xor = hash1 ^ hash2;

        // Count the number of set bits in the XOR result
        let distance = 0;
        let bits = xor;

        while (bits > 0n) {
            if (bits & 1n) {
                distance++;
            }
            bits = bits >> 1n;
        }

        return distance;
    }
}

// Export a default instance for simple usage
export default new SimHashStore();
