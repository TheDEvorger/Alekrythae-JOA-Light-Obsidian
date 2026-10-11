import { IdSource } from "../../domain/shared/IdSource";

export class WebCryptoIdSource implements IdSource {
  next(prefix: string): string {
    const cryptoApi = globalThis.crypto;
    const id = typeof cryptoApi?.randomUUID === "function"
      ? cryptoApi.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${id}`;
  }
}
