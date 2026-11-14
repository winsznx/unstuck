import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { NOT_CONNECTED_REASON } from "./account";

/**
 * AES-256-GCM sealing for Agent Market tokens at rest. The key is MARKET_TOKEN_KEY, 32 bytes in base64
 * (`openssl rand -base64 32`). `purpose` is bound in as associated data, so an access token's ciphertext can't be
 * passed off as a refresh token or a device code.
 */

export class MarketKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketKeyError";
  }
}

export type SealPurpose = "access" | "refresh" | "device";

const VERSION = "v1";

export function tokenKey(value: string | undefined = process.env.MARKET_TOKEN_KEY): Buffer {
  if (!value?.trim()) throw new MarketKeyError(NOT_CONNECTED_REASON);
  const key = Buffer.from(value.trim(), "base64");
  if (key.length !== 32) throw new MarketKeyError("MARKET_TOKEN_KEY has to be 32 bytes in base64. Make one with `openssl rand -base64 32`.");
  return key;
}

export function seal(plaintext: string, purpose: SealPurpose, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** Throws when the value was tampered with, sealed for another purpose, or sealed under another key. */
export function unseal(sealed: string, purpose: SealPurpose, key: Buffer): string {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || body === undefined) throw new Error("not a sealed Agent Market value");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
