import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.client = createClient(supabaseUrl, serviceRoleKey);
  }

  private getCvBucket(): string {
    return this.configService.getOrThrow<string>('SUPABASE_STORAGE_CV_BUCKET');
  }

  async uploadCv(file: Express.Multer.File): Promise<string> {
    const cvId = randomUUID();
    const cvBucket = this.getCvBucket();
    const { error } = await this.client.storage
      .from(cvBucket)
      .upload(`${cvId}.pdf`, file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `CV upload failed: ${error.message}`,
      );
    }

    return cvId;
  }

  async getCvFile(cvId: string): Promise<Express.Multer.File> {
    const cvBucket = this.getCvBucket();
    const { data, error } = await this.client.storage
      .from(cvBucket)
      .download(`${cvId}.pdf`);
    if (error) {
      throw new InternalServerErrorException(
        `CV download failed: ${error.message}`,
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const filename = `${cvId}.pdf`;

    return {
      fieldname: 'cv',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: buffer.length,
      buffer,
    } as Express.Multer.File;
  }
}
