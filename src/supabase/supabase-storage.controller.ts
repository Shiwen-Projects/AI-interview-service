import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';

@Controller('storage')
export class SupabaseStorageController {
  constructor(
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  @Get('files/:cvId')
  getCvFile(@Param('cvId') cvId: string): Promise<StreamableFile> {
    return this.supabaseStorageService.getCvFile(cvId);
  }
}
