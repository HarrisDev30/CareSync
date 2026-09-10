import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class Argon2Service {
  /**
   * Hashes a password using Argon2id with healthcare-grade security parameters:
   * memoryCost: 65536 KB (64 MB)
   * timeCost: 3 iterations
   * parallelism: 4 threads
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verifies plaintext password against stored Argon2id hash.
   */
  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}

