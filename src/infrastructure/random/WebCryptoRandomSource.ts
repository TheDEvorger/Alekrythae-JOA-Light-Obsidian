import { RandomSource } from "../../domain/shared/RandomSource";

export class WebCryptoRandomSource implements RandomSource {
  integer(minInclusive: number, maxInclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive) || maxInclusive < minInclusive) {
      throw new Error("Geçersiz rastgele sayı aralığı.");
    }

    const range = maxInclusive - minInclusive + 1;
    if (range <= 0 || range > 0x100000000) {
      throw new Error("Rastgele sayı aralığı desteklenmiyor.");
    }

    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.getRandomValues) {
      throw new Error("Web Crypto kullanılamıyor; adil zar atılamadı.");
    }

    const bucketCount = Math.floor(0x100000000 / range);
    const limit = bucketCount * range;
    const buffer = new Uint32Array(1);

    do {
      cryptoApi.getRandomValues(buffer);
    } while (buffer[0] >= limit);

    return minInclusive + (buffer[0] % range);
  }
}
