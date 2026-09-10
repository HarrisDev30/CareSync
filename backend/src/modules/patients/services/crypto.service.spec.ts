import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CARE_SYNC_ENCRYPTION_KEY') {
                return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt and decrypt roundtrip', () => {
    it('should encrypt plaintext and successfully decrypt it back', () => {
      const sensitiveData = '987-65-4321';
      const encrypted = service.encrypt(sensitiveData);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toEqual(sensitiveData);
      expect(encrypted.split(':').length).toBe(3);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toEqual(sensitiveData);
    });

    it('should produce distinct ciphertexts for identical plaintext due to unique IVs', () => {
      const plaintext = '+1-555-019-8821';
      const enc1 = service.encrypt(plaintext);
      const enc2 = service.encrypt(plaintext);

      expect(enc1).not.toEqual(enc2);
      expect(service.decrypt(enc1)).toEqual(plaintext);
      expect(service.decrypt(enc2)).toEqual(plaintext);
    });

    it('should throw an exception if ciphertext is tampered with', () => {
      const plaintext = '742 Evergreen Terrace';
      const encrypted = service.encrypt(plaintext);
      const parts = encrypted.split(':');
      
      // Tamper with the ciphertext byte
      const tamperedCiphertext = Buffer.from('TAMPERED').toString('base64');
      const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should throw an exception if auth tag is modified', () => {
      const plaintext = 'Secret medical record';
      const encrypted = service.encrypt(plaintext);
      const parts = encrypted.split(':');
      
      // Corrupt the auth tag
      const corruptedTag = Buffer.from('CORRUPTED_AUTH_TAG').toString('base64');
      const corrupted = `${parts[0]}:${corruptedTag}:${parts[2]}`;

      expect(() => service.decrypt(corrupted)).toThrow();
    });
  });

  describe('masking utilities', () => {
    it('should mask national ID showing only last 4 digits', () => {
      expect(service.maskNationalId('123-45-6789')).toEqual('XXX-XX-6789');
      expect(service.maskNationalId('987654321')).toEqual('XXX-XX-4321');
    });

    it('should mask phone number preserving only last 4 digits', () => {
      expect(service.maskPhone('+1-555-019-8821')).toEqual('(***) ***-8821');
      expect(service.maskPhone('5550198821')).toEqual('(***) ***-8821');
    });
  });
});

