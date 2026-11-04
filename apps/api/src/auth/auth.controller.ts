import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { LoginResponse } from '@cafeteria/shared';
import { AuthService } from './auth.service.js';
import { LoginDto } from './login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.auth.login(dto.email, dto.password);
  }
}
