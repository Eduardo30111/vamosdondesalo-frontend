import { Controller, Get, Put, Body, Param, Request, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(
    private service: ChatbotService,
    private prisma: PrismaService
  ) {}

  private async getStoreId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { storeId: true, role: true },
    });
    if (!user || !user.storeId) {
      throw new ForbiddenException('No tienes ninguna tienda asociada');
    }
    return user.storeId;
  }

  @Get('config')
  async getConfig(@Request() req: any) {
    const storeId = await this.getStoreId(req.user.id);
    return this.service.getChatbotConfig(storeId);
  }

  @Put('config')
  async updateConfig(@Request() req: any, @Body() body: any) {
    const storeId = await this.getStoreId(req.user.id);
    return this.service.updateChatbotConfig(storeId, body);
  }
}

@Controller(['api/store', 'store'])
export class PublicChatbotController {
  constructor(private service: ChatbotService) {}

  @Get(':storeId/products')
  async getProducts(@Param('storeId') storeId: string) {
    const products = await this.service.getAvailableProducts(storeId);
    return { products };
  }

  @Get(':storeId/chatbot-context')
  async getContext(@Param('storeId') storeId: string) {
    return this.service.getChatbotContext(storeId);
  }
}
