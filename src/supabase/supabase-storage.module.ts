import { Module } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';
import { SupabaseStorageController } from './supabase-storage.controller';

@Module({
  controllers: [SupabaseStorageController],
  providers: [SupabaseStorageService],
  exports: [SupabaseStorageService],
})
export class SupabaseStorageModule {}
