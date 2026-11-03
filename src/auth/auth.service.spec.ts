import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { OtpService } from '../otp/otp.service';
import * as bcrypt from 'bcrypt';

const user = {
  id: 'u-1',
  name: 'John',
  email: 'john@example.com',
  phone: null,
  passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
  role: 'customer',
  isVerified: false,
  isActive: true,
  isDeleted: false,
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: Record<string, jest.Mock> };
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((k: string) => `secret-${k}`),
            get: jest.fn((_, d) => d),
          },
        },
        { provide: CacheService, useValue: cache },
        {
          provide: MailService,
          useValue: { send: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: OtpService, useValue: { verify: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates a user with a hashed password and issues tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...user,
        email: 'new@example.com',
      });

      const result = await service.register({
        name: 'New',
        email: 'NEW@example.com',
        password: 'Secret@123',
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: 'new@example.com' }] },
      });
      const created = prisma.user.create.mock.calls[0][0].data;
      expect(created.email).toBe('new@example.com');
      expect(created.passwordHash).not.toBe('Secret@123'); // hashed
      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe('new@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate email with 409', async () => {
      prisma.user.findFirst.mockResolvedValue(user);
      await expect(
        service.register({
          name: 'X',
          email: 'john@example.com',
          password: 'Secret@123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('rejects unknown users and wrong passwords with the same 401', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('a@b.com', 'pw')).rejects.toThrow(
        UnauthorizedException,
      );

      prisma.user.findUnique.mockResolvedValue(user);
      await expect(service.login('a@b.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects blocked accounts with 403', async () => {
      const hash = await bcrypt.hash('Secret@123', 4);
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        passwordHash: hash,
        isActive: false,
      });
      await expect(
        service.login('john@example.com', 'Secret@123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns a safe user (no password hash) on success', async () => {
      // bcrypt.compare must return true — use a real hash for "Secret@123"
      const hash = await bcrypt.hash('Secret@123', 4);
      prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash: hash });
      prisma.user.update.mockResolvedValue(user);

      const result = await service.login('john@example.com', 'Secret@123');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toBe('signed-token');
      expect(cache.set).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rejects tokens that fail signature verification', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('bad'));
      await expect(service.refresh('junk')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects revoked (rotated) refresh tokens', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'u-1',
        jti: 'jti-1',
        type: 'refresh',
      });
      cache.get.mockResolvedValue(null); // no longer in cache → revoked
      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects tokens whose version was bumped (password reset)', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'u-1',
        jti: 'jti-1',
        type: 'refresh',
        v: 0,
      });
      cache.get.mockImplementation(
        (key: string) => Promise.resolve(key === 'refresh:jti-1' ? 'u-1' : '2'), // version now 2
      );
      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates a valid token: revokes old and issues a new pair', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'u-1',
        jti: 'jti-1',
        type: 'refresh',
        v: 0,
      });
      cache.get.mockImplementation((key: string) =>
        Promise.resolve(key === 'refresh:jti-1' ? 'u-1' : '0'),
      );
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.refresh('token');
      expect(cache.del).toHaveBeenCalledWith('refresh:jti-1');
      expect(result.accessToken).toBe('signed-token');
    });
  });

  describe('resetPassword', () => {
    it('rejects unknown/expired reset tokens', async () => {
      cache.get.mockResolvedValue(null);
      await expect(
        service.resetPassword('tok', 'NewSecret@123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the password, clears the token and bumps the token version', async () => {
      cache.get.mockResolvedValue('u-1');
      prisma.user.update.mockResolvedValue(user);

      await service.resetPassword('tok', 'NewSecret@123');

      expect(prisma.user.update).toHaveBeenCalled();
      expect(cache.del).toHaveBeenCalledWith('reset:tok');
      // version bump → every outstanding refresh token is invalidated
      expect(cache.set).toHaveBeenCalledWith('refresh:v:u-1', '1');
    });
  });
});
