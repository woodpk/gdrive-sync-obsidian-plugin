import { contractId, type BinaryContentSource, type ContentHash } from "../contracts/common";

const K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);

function rotr(value: number, bits: number): number { return (value >>> bits) | (value << (32 - bits)); }

/** Incremental, dependency-free SHA-256 suitable for mobile-required runtime paths. */
export class Sha256 {
  private h0 = 0x6a09e667; private h1 = 0xbb67ae85; private h2 = 0x3c6ef372; private h3 = 0xa54ff53a;
  private h4 = 0x510e527f; private h5 = 0x9b05688c; private h6 = 0x1f83d9ab; private h7 = 0x5be0cd19;
  private readonly buffer = new Uint8Array(64);
  private bufferLength = 0;
  private bytesHashed = 0;
  private finished = false;
  private readonly words = new Uint32Array(64);

  update(data: Uint8Array): this {
    if (this.finished) throw new Error("SHA-256 digest is already finalized");
    if (!data.byteLength) return this;
    this.bytesHashed += data.byteLength;
    let offset = 0;
    if (this.bufferLength) {
      const take = Math.min(64 - this.bufferLength, data.byteLength);
      this.buffer.set(data.subarray(0, take), this.bufferLength);
      this.bufferLength += take; offset += take;
      if (this.bufferLength === 64) { this.process(this.buffer); this.bufferLength = 0; }
    }
    while (offset + 64 <= data.byteLength) { this.process(data.subarray(offset, offset + 64)); offset += 64; }
    if (offset < data.byteLength) { this.buffer.set(data.subarray(offset), 0); this.bufferLength = data.byteLength - offset; }
    return this;
  }

  digestHex(): string {
    if (!this.finished) this.finish();
    return [this.h0,this.h1,this.h2,this.h3,this.h4,this.h5,this.h6,this.h7]
      .map(value => (value >>> 0).toString(16).padStart(8, "0")).join("");
  }

  private finish(): void {
    const bytes = this.bytesHashed;
    const block = new Uint8Array(128);
    block.set(this.buffer.subarray(0, this.bufferLength));
    block[this.bufferLength] = 0x80;
    const padLength = this.bufferLength < 56 ? 64 : 128;
    const high = Math.floor(bytes / 0x20000000);
    const low = (bytes * 8) >>> 0;
    block[padLength - 8] = (high >>> 24) & 0xff;
    block[padLength - 7] = (high >>> 16) & 0xff;
    block[padLength - 6] = (high >>> 8) & 0xff;
    block[padLength - 5] = high & 0xff;
    block[padLength - 4] = (low >>> 24) & 0xff;
    block[padLength - 3] = (low >>> 16) & 0xff;
    block[padLength - 2] = (low >>> 8) & 0xff;
    block[padLength - 1] = low & 0xff;
    this.process(block.subarray(0, 64));
    if (padLength === 128) this.process(block.subarray(64, 128));
    this.finished = true;
  }

  private process(block: Uint8Array): void {
    const w = this.words;
    for (let i = 0; i < 16; i += 1) {
      const j = i * 4;
      w[i] = ((block[j] << 24) | (block[j + 1] << 16) | (block[j + 2] << 8) | block[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
      const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a=this.h0,b=this.h1,c=this.h2,d=this.h3,e=this.h4,f=this.h5,g=this.h6,h=this.h7;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + s1 + ch + K[i] + w[i]) >>> 0;
      const s0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    this.h0=(this.h0+a)>>>0; this.h1=(this.h1+b)>>>0; this.h2=(this.h2+c)>>>0; this.h3=(this.h3+d)>>>0;
    this.h4=(this.h4+e)>>>0; this.h5=(this.h5+f)>>>0; this.h6=(this.h6+g)>>>0; this.h7=(this.h7+h)>>>0;
  }
}

export function sha256Bytes(bytes: Uint8Array): ContentHash {
  return contractId<"ContentHash">(`sha256:${new Sha256().update(bytes).digestHex()}`) as ContentHash;
}

export function sha256Text(text: string): ContentHash { return sha256Bytes(new TextEncoder().encode(text)); }

export async function sha256BinarySource(source: BinaryContentSource): Promise<ContentHash> {
  const hash = new Sha256();
  for await (const chunk of source.openChunks()) hash.update(chunk);
  return contractId<"ContentHash">(`sha256:${hash.digestHex()}`) as ContentHash;
}

export function isCanonicalSha256(value: unknown): value is ContentHash {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}
