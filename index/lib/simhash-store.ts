export type SimHashValue = bigint;

export class SimHashStore {
  private numBands: number;
  private bitsPerBand: number;
  private hammingDistanceThreshold: number;
  private bandTables: Map<string, SimHashValue[]>[];
  private allHashes: Set<string>;

  /**
   * 
   * @param hammingDistanceThreshold Threshold for considering two hashes as duplicates
   * @param hashBits Total bits in the SimHash value (default: 64)
   */
  constructor(hammingDistanceThreshold: number = 3, hashBits: number = 64) {
    this.hammingDistanceThreshold = hammingDistanceThreshold;
    
    // Calculate optimal number of bands based on threshold
    this.numBands = hammingDistanceThreshold + 1;
    this.bitsPerBand = Math.floor(hashBits / this.numBands);
    
    // Initialize band tables
    this.bandTables = Array(this.numBands)
      .fill(null)
      .map(() => new Map<string, SimHashValue[]>());
    
    this.allHashes = new Set<string>();
  }

  /**
   * Adds a hash to the store
   * 
   * @param hash SimHash value to add
   * @returns true if added as new, false if detected as duplicate
   */
  public add(hash: SimHashValue): boolean {
    // Check for exact duplicates first
    const hashStr = hash.toString();
    if (this.allHashes.has(hashStr)) {
      return false;
    }
    
    // Check for near-duplicates
    if (this.isDuplicate(hash)) {
      return false;
    }
    
    // Add to the set of all hashes
    this.allHashes.add(hashStr);
    // Add to band tables
    this.addToBandTables(hash);
    
    return true;
  }

  /**
   * Checks if a hash is a duplicate of any hash in the store
   * 
   * @param hash SimHash value to check
   * @returns true if duplicate, false otherwise
   */
  public isDuplicate(hash: SimHashValue): boolean {
    // Get candidate matches from band tables
    const candidates = this.getCandidateMatches(hash);
    
    // Check Hamming distance for each candidate
    for (const candidate of candidates) {
      if (this.hammingDistance(hash, candidate) <= this.hammingDistanceThreshold) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Adds a hash to all band tables
   */
  private addToBandTables(hash: SimHashValue): void {
    for (let bandIndex = 0; bandIndex < this.numBands; bandIndex++) {
      const bandHash = this.getBandHash(hash, bandIndex);
      
      if (!this.bandTables[bandIndex].has(bandHash)) {
        this.bandTables[bandIndex].set(bandHash, []);
      }
      
      this.bandTables[bandIndex].get(bandHash)!.push(hash);
    }
  }

  /**
   * Gets candidate matches for a hash from band tables
   */
  private getCandidateMatches(hash: SimHashValue): Set<SimHashValue> {
    const candidates = new Set<SimHashValue>();
    
    for (let bandIndex = 0; bandIndex < this.numBands; bandIndex++) {
      const bandHash = this.getBandHash(hash, bandIndex);
      const matches = this.bandTables[bandIndex].get(bandHash) || [];
      
      for (const match of matches) {
        candidates.add(match);
      }
    }
    
    return candidates;
  }

  /**
   * Extracts a specific band from a hash as a string
   */
  private getBandHash(hash: SimHashValue, bandIndex: number): string {
    const shift = BigInt(bandIndex * this.bitsPerBand);
    const mask = (1n << BigInt(this.bitsPerBand)) - 1n;
    const bandValue = (hash >> shift) & mask;
    return bandValue.toString();
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