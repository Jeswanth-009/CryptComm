/**
 * CryptComm Encryption Library
 * Implements RSA-OAEP for key exchange and AES-256-GCM for message encryption
 */

import type { KeyPair, ExportedKeyPair, EncryptionResult } from '@/types';

// Constants
const RSA_KEY_SIZE = 2048;
const AES_KEY_SIZE = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate RSA key pair for asymmetric encryption
 */
export async function generateRSAKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: RSA_KEY_SIZE,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Generate AES-256 key for symmetric encryption
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: AES_KEY_SIZE,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random initialization vector
 */
export function generateIV(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Export public key to base64 string
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  return arrayBufferToBase64(exported);
}

/**
 * Export private key to base64 string (for local storage only)
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
  return arrayBufferToBase64(exported);
}

/**
 * Export key pair to strings
 */
export async function exportKeyPair(keyPair: KeyPair): Promise<ExportedKeyPair> {
  const [publicKey, privateKey] = await Promise.all([
    exportPublicKey(keyPair.publicKey),
    exportPrivateKey(keyPair.privateKey),
  ]);
  return { publicKey, privateKey };
}

/**
 * Import public key from base64 string
 */
export async function importPublicKey(publicKeyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(publicKeyString);
  return await window.crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
}

/**
 * Import private key from base64 string
 */
export async function importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(privateKeyString);
  return await window.crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );
}

/**
 * Generate key fingerprint for identity verification
 */
export async function generateFingerprint(publicKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', exported);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Format as fingerprint (XX:XX:XX:XX...)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
}

/**
 * Generate shortened fingerprint for display
 */
export function shortenFingerprint(fingerprint: string): string {
  const parts = fingerprint.split(':');
  return `${parts.slice(0, 4).join(':')}...${parts.slice(-4).join(':')}`;
}

/**
 * Encrypt AES key with RSA public key
 */
export async function encryptAESKey(
  aesKey: CryptoKey,
  publicKey: CryptoKey
): Promise<string> {
  const exportedAESKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const encryptedKey = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    exportedAESKey
  );
  return arrayBufferToBase64(encryptedKey);
}

/**
 * Decrypt AES key with RSA private key
 */
export async function decryptAESKey(
  encryptedKeyString: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedKey = base64ToArrayBuffer(encryptedKeyString);
  const decryptedKey = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedKey
  );
  return await window.crypto.subtle.importKey(
    'raw',
    decryptedKey,
    { name: 'AES-GCM', length: AES_KEY_SIZE },
    false,
    ['decrypt']
  );
}

/**
 * Encrypt message content with AES-256-GCM
 */
export async function encryptMessage(
  plaintext: string,
  aesKey: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    data
  );
  
  return arrayBufferToBase64(encrypted);
}

/**
 * Decrypt message content with AES-256-GCM
 */
export async function decryptMessage(
  encryptedContent: string,
  aesKey: CryptoKey,
  ivString: string
): Promise<string> {
  const encryptedData = base64ToArrayBuffer(encryptedContent);
  const iv = base64ToArrayBuffer(ivString);
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    aesKey,
    encryptedData
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt a message for multiple recipients
 * Returns encrypted content + encrypted AES keys for each recipient
 */
export async function encryptForRecipients(
  plaintext: string,
  recipientPublicKeys: Map<string, CryptoKey>
): Promise<EncryptionResult> {
  // Generate random AES key for this message
  const aesKey = await generateAESKey();
  
  // Generate random IV
  const iv = generateIV();
  
  // Encrypt the message content
  const encryptedContent = await encryptMessage(plaintext, aesKey, iv);
  
  // Encrypt the AES key for each recipient
  const encryptedKeys: Record<string, string> = {};
  
  for (const [userId, publicKey] of recipientPublicKeys) {
    encryptedKeys[userId] = await encryptAESKey(aesKey, publicKey);
  }
  
  return {
    encryptedContent,
    encryptedKeys,
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt a message using the recipient's private key
 */
export async function decryptFromSender(
  encryptedContent: string,
  encryptedKey: string,
  iv: string,
  privateKey: CryptoKey
): Promise<string> {
  // Decrypt the AES key using our private key
  const aesKey = await decryptAESKey(encryptedKey, privateKey);
  
  // Decrypt the message content
  return await decryptMessage(encryptedContent, aesKey, iv);
}

// Utility functions
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Store keys securely in localStorage (encrypted with a password in production)
 */
export function storeKeys(keyPair: ExportedKeyPair): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cryptcomm_public_key', keyPair.publicKey);
    localStorage.setItem('cryptcomm_private_key', keyPair.privateKey);
  }
}

/**
 * Retrieve stored keys from localStorage
 */
export function getStoredKeys(): ExportedKeyPair | null {
  if (typeof window === 'undefined') return null;
  
  const publicKey = localStorage.getItem('cryptcomm_public_key');
  const privateKey = localStorage.getItem('cryptcomm_private_key');
  
  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }
  return null;
}

/**
 * Clear stored keys
 */
export function clearStoredKeys(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cryptcomm_public_key');
    localStorage.removeItem('cryptcomm_private_key');
  }
}

/**
 * Initialize or retrieve encryption keys
 */
export async function initializeEncryption(): Promise<{
  keyPair: KeyPair;
  exportedKeyPair: ExportedKeyPair;
  fingerprint: string;
}> {
  const storedKeys = getStoredKeys();
  
  if (storedKeys) {
    // Import existing keys
    const [publicKey, privateKey] = await Promise.all([
      importPublicKey(storedKeys.publicKey),
      importPrivateKey(storedKeys.privateKey),
    ]);
    
    const fingerprint = await generateFingerprint(publicKey);
    
    return {
      keyPair: { publicKey, privateKey },
      exportedKeyPair: storedKeys,
      fingerprint,
    };
  }
  
  // Generate new keys
  const keyPair = await generateRSAKeyPair();
  const exportedKeyPair = await exportKeyPair(keyPair);
  const fingerprint = await generateFingerprint(keyPair.publicKey);
  
  // Store for future sessions
  storeKeys(exportedKeyPair);
  
  return { keyPair, exportedKeyPair, fingerprint };
}
