import { Controller, Post, Body, HttpCode, Req, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ContactService } from './contact.service';
import { CreateContactDto, SubscribeDto } from './dto/contact.dto';

@ApiTags('Contact')
@Controller()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post('contact')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ResponseMessage('Thanks — we will get back to you within one working day')
  @ApiOperation({ summary: 'Send a message to the AQ care team' })
  create(
    @Body() dto: CreateContactDto,
    @Req() req: Request,
    @Headers('x-forwarded-for') forwarded: string | undefined,
  ) {
    const ip =
      forwarded?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || '';
    return this.contactService.create(dto, ip);
  }

  @Public()
  @Post('newsletter')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ResponseMessage('You are on the list — welcome to the ritual letter')
  @ApiOperation({ summary: 'Subscribe to the newsletter (double-safe consent)' })
  subscribe(@Body() dto: SubscribeDto, @Req() req: Request) {
    return this.contactService.subscribe(dto, req.ip ?? '');
  }
}
