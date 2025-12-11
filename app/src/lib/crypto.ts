/**
 * XOR encrypt text with key (UTF-8 safe)
 */
export function xorEncrypt(text: string, key: string): string {
  if (!key) return text;

  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const keyBytes = encoder.encode(key);
  const encrypted = new Uint8Array(textBytes.length);

  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  let binary = '';
  for (let i = 0; i < encrypted.length; i++) {
    binary += String.fromCharCode(encrypted[i]);
  }

  return btoa(binary);
}

/**
 * XOR decrypt base64 text with key (UTF-8 safe)
 */
export function xorDecrypt(encryptedBase64: string, key: string): string {
  if (!key) return encryptedBase64;

  const binary = atob(encryptedBase64);
  const encrypted = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    encrypted[i] = binary.charCodeAt(i);
  }

  const keyBytes = new TextEncoder().encode(key);
  const decrypted = new Uint8Array(encrypted.length);

  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(decrypted);
}
