import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode');

@Controller('tables')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDEDOR')
  findAll() {
    return this.tablesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() body: { number: number }) {
    return this.tablesService.create(body.number);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() body: { number: number }) {
    return this.tablesService.update(id, body.number);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.tablesService.delete(id);
  }

  @Post(':id/regenerate-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  regenerateToken(@Param('id') id: string) {
    return this.tablesService.regenerateToken(id);
  }

  @Get(':id/qr')
  async downloadQr(
    @Param('id') id: string,
    @Query('format') format: string,
    @Query('frontendUrl') frontendUrl: string,
    @Res() res: Response,
  ) {
    const table = await this.tablesService.findById(id);
    if (!table) {
      res.status(404).json({ message: 'Mesa no encontrada' });
      return;
    }
    const base = frontendUrl || process.env.PUBLIC_URL || 'http://localhost:3000';
    const url = `${base}/mesa/${table.qrToken}`;

    if (format === 'pdf') {
      const html = `
        <html>
          <head><style>body{text-align:center;font-family:sans-serif;padding:40px;}</style></head>
          <body>
            <h1>Mesa ${table.number}</h1>
            <h2>Donde Salo!</h2>
            <img src="${await QRCode.toDataURL(url)}" width="300" height="300" />
            <p>Escanea para ordenar</p>
            <p style="font-size:12px;color:#888;">${url}</p>
          </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="mesa-${table.number}.pdf"`);
      res.send(html);
      return;
    }

    const pngBuffer = await QRCode.toBuffer(url, { type: 'png', width: 400, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="mesa-${table.number}.png"`);
    res.send(pngBuffer);
  }
}
