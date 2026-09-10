import { Test, TestingModule } from '@nestjs/testing';
import { Argon2Service } from './argon2.service';

describe('Argon2Service', () => {
  let service: Argon2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Argon2Service],
    }).compile();

    service = module.get<Argon2Service>(Argon2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash a password and verify it successfully', async () => {
    const password = 'ClinicalSecurePass2026!';
    const hash = await service.hash(password);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const isMatch = await service.verify(hash, password);
    expect(isMatch).toBe(true);
  });

  it('should return false for an incorrect password', async () => {
    const password = 'ClinicalSecurePass2026!';
    const hash = await service.hash(password);

    const isMatch = await service.verify(hash, 'WrongPassword123');
    expect(isMatch).toBe(false);
  });
});

