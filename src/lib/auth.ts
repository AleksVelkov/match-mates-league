/**
 * PBKDF2-based password hashing using the Web Crypto API (native in Cloudflare
 * Workers). Sessions are stored in D1; cookies via TanStack Start's set/getCookie.
 *
 * Hash format is versioned so the work factor can be raised over time:
 *   pbkdf2$<iterations>$<saltHex>$<hashHex>
 * Legacy hashes ("<saltHex>:<hashHex>", 100k iterations) still verify.
 */

const ITERATIONS = 600_000; // OWASP 2023 floor for PBKDF2-SHA256
const LEGACY_ITERATIONS = 100_000;
const HASH = "SHA-256";
const SALT_LEN = 16;
const KEY_BITS = 256;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveHex(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: HASH },
    key,
    KEY_BITS,
  );
  return toHex(new Uint8Array(bits));
}

/** Constant-time string comparison to avoid leaking match progress via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const hashHex = await deriveHex(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  let iterations: number;
  let saltHex: string;
  let hashHex: string;

  const parts = stored.split("$");
  if (parts.length === 4 && parts[0] === "pbkdf2") {
    iterations = parseInt(parts[1], 10);
    saltHex = parts[2];
    hashHex = parts[3];
  } else {
    // Legacy "<saltHex>:<hashHex>" format @ 100k iterations.
    const [s, h] = stored.split(":");
    if (!s || !h) return false;
    iterations = LEGACY_ITERATIONS;
    saltHex = s;
    hashHex = h;
  }

  if (!Number.isFinite(iterations) || !/^[0-9a-f]+$/i.test(saltHex)) return false;
  const salt = new Uint8Array(saltHex.match(/../g)!.map((b) => parseInt(b, 16)));
  const derived = await deriveHex(password, salt, iterations);
  return timingSafeEqual(derived, hashHex);
}

/** True if a stored hash should be re-hashed with current parameters on next login. */
function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return true;
  return parseInt(parts[1], 10) < ITERATIONS;
}

export { hashPassword, verifyPassword, needsRehash };
