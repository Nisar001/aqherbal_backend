import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { CacheService } from '../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { OtpService } from '../otp/otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_SECONDS = 1800; // 30 minutes
const REFRESH_PREFIX = 'refresh:';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isVerified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
    private readonly mail: MailService,
    private readonly otpService: OtpService,
  ) {}

  async register(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(input.phone ? [{ phone: input.phone }] : [])],
      },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === email
          ? 'Email is already registered'
          : 'Phone number is already registered',
      );
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email,
        phone: input.phone,
        passwordHash,
      },
    });

    const tokens = await this.issueTokenPair(user);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new ForbiddenException('Account is blocked');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokenPair(user);
    return { user: this.toSafeUser(user), ...tokens };
  }

  /**
   * Rotates the refresh token: the presented token must be valid and not yet
   * revoked; it is revoked and a fresh pair issued.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string; jti?: string; type?: string; v?: number };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const cacheKey = `${REFRESH_PREFIX}${payload.jti}`;
    const storedUserId = await this.cache.get(cacheKey);
    if (storedUserId !== payload.sub) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    const currentVersion = await this.getTokenVersion(payload.sub);
    if ((payload.v ?? 0) !== currentVersion) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.isDeleted)
      throw new UnauthorizedException('Invalid refresh token');
    if (!user.isActive) throw new ForbiddenException('Account is blocked');

    await this.cache.del(cacheKey); // rotate: single-use
    return this.issueTokenPair(user);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return; // client discards tokens; nothing to revoke
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        ignoreExpiration: true,
      });
      if (payload.jti) await this.cache.del(`${REFRESH_PREFIX}${payload.jti}`);
    } catch {
      // already invalid — nothing to do
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.isDeleted) {
      // Do not reveal whether the account exists
      this.logger.log(`Password reset requested for unknown email ${email}`);
      return;
    }

    const token = randomBytes(32).toString('hex');
    await this.cache.set(`reset:${token}`, user.id, RESET_TOKEN_TTL_SECONDS);

    const appUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const link = `${appUrl}/reset-password?token=${token}`;
    try {
      await this.mail.send(
        user.email,
        'Reset your AQ Herbal password',
        `Use this link within 30 minutes to reset your password:\n${link}\n\nIf you did not request this, ignore this email.`,
      );
    } catch (err) {
      this.logger.error(
        `Password reset email failed: ${(err as Error).message}`,
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.cache.get(`reset:${token}`);
    if (!userId)
      throw new BadRequestException('Reset link is invalid or expired');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
    });
    await this.cache.del(`reset:${token}`);
    await this.bumpTokenVersion(userId);
  }

  /** OTP-based mobile login; creates an account on first use of a phone number. */
  async otpLogin(phone: string, code: string, name?: string) {
    const valid = await this.otpService.verify(phone, code);
    if (!valid) throw new UnauthorizedException('Invalid or expired OTP');

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (user && user.isDeleted)
      throw new UnauthorizedException('Account is blocked');
    if (user && !user.isActive)
      throw new ForbiddenException('Account is blocked');

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: name?.trim() || `Customer ${phone.slice(-4)}`,
          // phone-only accounts get a placeholder unique email
          email: `phone_${phone.replace(/\D/g, '')}@aqherbal.invalid`,
          phone,
          passwordHash: await bcrypt.hash(randomUUID(), SALT_ROUNDS),
          isVerified: true,
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokenPair(user);
    return { user: this.toSafeUser(user), ...tokens };
  }

  // --------------------------------- helpers --------------------------------

  private async issueTokenPair(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<TokenPair> {
    const jti = randomUUID();
    const version = await this.getTokenVersion(user.id);
    const accessTtl = this.configService.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshTtl = this.configService.get<string>('JWT_REFRESH_TTL', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role, type: 'access' },
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessTtl as StringValue,
        },
      ),
      this.jwtService.signAsync(
        { sub: user.id, jti, v: version, type: 'refresh' },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshTtl as StringValue,
        },
      ),
    ]);

    await this.cache.set(
      `${REFRESH_PREFIX}${jti}`,
      user.id,
      this.ttlToSeconds(refreshTtl),
    );
    return { accessToken, refreshToken };
  }

  /** Bumping the version invalidates every outstanding refresh token for a user. */
  private async bumpTokenVersion(userId: string): Promise<void> {
    const next = (await this.getTokenVersion(userId)) + 1;
    await this.cache.set(`${REFRESH_PREFIX}v:${userId}`, String(next));
  }

  private async getTokenVersion(userId: string): Promise<number> {
    const raw = await this.cache.get(`${REFRESH_PREFIX}v:${userId}`);
    return raw ? parseInt(raw, 10) || 0 : 0;
  }

  private ttlToSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!match) return 7 * 24 * 3600;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const factor = { s: 1, m: 60, h: 3600, d: 86400 }[
      unit as 's' | 'm' | 'h' | 'd'
    ];
    return value * factor;
  }

  toSafeUser(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    isVerified: boolean;
  }): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
    };
  }
}
