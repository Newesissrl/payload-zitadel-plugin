import type { PKCE } from "../types";
import crypto from "crypto";

// GENERATING CODE VERIFIER
function dec2hex(dec) {
  return ("0" + dec.toString(16)).substr(-2);
}

function sha256(plain) {
  // returns promise ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  if (typeof window !== "undefined") {
    return window.crypto.subtle.digest("SHA-256", data);
  }

  return crypto.subtle.digest("SHA-256", data);
}

function base64urlencode(a) {
  let str = "";
  const bytes = new Uint8Array(a);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier() {
  const array = new Uint32Array(56 / 2);
  if (typeof window !== "undefined") {
    window.crypto.getRandomValues(array);
  } else {
    crypto.getRandomValues(array);
  }
  return Array.from(array, dec2hex).join("");
}

export async function generateCodeChallengeFromVerifier(v) {
  const hashed = await sha256(v);
  const base64encoded = base64urlencode(hashed);
  return base64encoded;
}

export async function generateCodeChallenge(): Promise<PKCE> {
  const code_verifier = generateCodeVerifier();
  const code_challenge = await generateCodeChallengeFromVerifier(code_verifier);
  return {
    code_verifier,
    code_challenge,
  };
}
