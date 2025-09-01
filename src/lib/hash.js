// src/lib/hash.js

// Universal async SHA-256 hash function that returns a hex string
export async function sha256(str) {
  if (window.crypto && window.crypto.subtle) {
    // Browser native
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    // Convert buffer to hex string
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    // Fallback: simple hash (not cryptographically secure)
    let hash = 0, i, chr;
    if (str.length === 0) return "0";
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}