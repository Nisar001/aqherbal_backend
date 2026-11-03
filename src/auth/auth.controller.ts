import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { LoginDto } from './dto/login.dto';
import { OtpSendDto, OtpVerifyDto } from './dto/otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { OtpService } from '../otp/otp.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Dual-shape auth payload:
   * - storefront reads `data.accessToken` / `data.refreshToken` / `data.user`
   * - admin panel reads top-level `token` / `refreshToken` / `user`
   */
  private envelope(result: {
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  }) {
    const { accessToken, refreshToken, user } = result;
    return {
      data: { accessToken, refreshToken, user },
      ...(accessToken ? { token: accessToken } : {}),
      ...(refreshToken ? { refreshToken } : {}),
      ...(user ? { user } : {}),
    };
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ResponseMessage('Registration successful')
  @ApiOperation({ summary: 'Register a customer account' })
  async register(@Body() dto: RegisterDto) {
    return this.envelope(await this.authService.register(dto));
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ResponseMessage('Login successful')
  @ApiOperation({ summary: 'Login with email + password' })
  async login(@Body() dto: LoginDto) {
    return this.envelope(await this.authService.login(dto.email, dto.password));
  }

  @Public()
  @Post('otp/send')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ResponseMessage('OTP sent')
  @ApiOperation({ summary: 'Send a login OTP to a mobile number' })
  async sendOtp(@Body() dto: OtpSendDto) {
    try {
      await this.otpService.send(dto.phone);
      return { data: null };
    } catch (err) {
      // rate-limit / cooldown messages surface as 400
      throw new BadRequestException((err as Error).message);
    }
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ResponseMessage('Login successful')
  @ApiOperation({
    summary: 'Verify OTP and log in (creates account on first use)',
  })
  async otpVerify(@Body() dto: OtpVerifyDto) {
    return this.envelope(
      await this.authService.otpLogin(dto.phone, dto.code, dto.name),
    );
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(200)
  @ResponseMessage('Token refreshed')
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.envelope(await this.authService.refresh(dto.refreshToken));
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ResponseMessage('Logged out successfully')
  @ApiOperation({ summary: 'Revoke the supplied refresh token' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { data: null };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ResponseMessage('If the email exists, a reset link has been sent')
  @ApiOperation({ summary: 'Request a password reset link' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { data: null };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ResponseMessage('Password has been reset')
  @ApiOperation({ summary: 'Reset password with a valid token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { data: null };
  }
}
