import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppConfigService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const configs = await this.prisma.appConfig.findMany();
    const map: Record<string, string> = {};
    configs.forEach(c => { map[c.key] = c.value; });
    return map;
  }

  async get(key: string) {
    const config = await this.prisma.appConfig.findUnique({ where: { key } });
    return config?.value || null;
  }

  async set(key: string, value: string) {
    return this.prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async setMany(configs: Record<string, string>) {
    const operations = Object.entries(configs).map(([key, value]) =>
      this.prisma.appConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );
    return this.prisma.$transaction(operations);
  }
}
