/**
 * =============================================================================
 * CRYPTO SERVICE
 * =============================================================================
 * 
 * Encryption/decryption for sensitive data like CRM API keys.
 * Uses AES-256-GCM for authenticated encryption.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('auth.encryptionKey', '0'.repeat(64));
    this.key = Buffer.from(keyHex, 'hex');
    
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
  }

  /**
   * Encrypt plaintext using AES-256-GCM.
   * Returns: base64(iv):base64(ciphertext):base64(authTag)
   */
  encrypt(plaintext: string): string {
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Return combined format
    return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
  }

  /**
   * Decrypt ciphertext encrypted with encrypt().
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const [ivBase64, encryptedBase64, authTagBase64] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
