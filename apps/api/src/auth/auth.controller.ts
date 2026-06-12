import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register-merchant')
  async registerMerchant(@Body() body: { name: string; email: string; password: string }) {
    return this.authService.registerMerchant(body.name, body.email, body.password);
  }
}
