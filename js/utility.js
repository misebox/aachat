// Utility class for utility functions
export class Utility {
  static generateSessionToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  static generateSuggestedKeyword(baseKeyword) {
    const suffixes = ['2', '3', 'b', 'alt', 'new', 'x'];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return baseKeyword + randomSuffix;
  }

  static xorEncrypt(text, key) {
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

  static xorDecrypt(encryptedBase64, key) {
    const binary = atob(encryptedBase64);
    const encrypted = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      encrypted[i] = binary.charCodeAt(i);
    }
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(key);
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}
