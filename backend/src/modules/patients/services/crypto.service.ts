import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('CARE_SYNC_ENCRYPTION_KEY') || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    if (rawKey.length === 64) {
      this.key = Buffer.from(rawKey, 'hex');
    } else {
      this.key = Buffer.from(rawKey.padEnd(32, '0').slice(0, 32), 'utf-8');
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns base64 formatted string: `iv:auth_tag:ciphertext`
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    try {
      const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
    } catch (error) {
      throw new InternalServerErrorException(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts ciphertext in format `iv:auth_tag:ciphertext` using AES-256-GCM.
   */
  decrypt(ciphertextPayload: string): string {
    if (!ciphertextPayload) {
      return ciphertextPayload;
    }

    try {
      const parts = ciphertextPayload.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format. Expected iv:auth_tag:ciphertext');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const ciphertext = Buffer.from(parts[2], 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new InternalServerErrorException(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Masks a National ID or SSN, showing only the last 4 characters.
   * Example: XXX-XX-1234
   */
  maskNationalId(nationalId: string): string {
    if (!nationalId) return '';
    const clean = nationalId.trim();
    if (clean.length <= 4) return '***';
    return `XXX-XX-${clean.slice(-4)}`;
  }

  /**
   * Masks a phone number, preserving only the last 4 digits.
   * Example: (***) ***-8821
   */
  maskPhone(phone: string): string {
    if (!phone) return '';
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length <= 4) return '***-****';
    const lastFour = digitsOnly.slice(-4);
    return `(***) ***-${lastFour}`;
  }
}

