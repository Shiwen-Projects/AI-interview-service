import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';

@Controller('storage')
export class SupabaseStorageController {
  constructor(
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  @Get('files/:cvId')
  async getCvFile(@Param('cvId') cvId: string): Promise<Express.Multer.File> {
    return await this.supabaseStorageService.getCvFile(cvId);
  }
}
