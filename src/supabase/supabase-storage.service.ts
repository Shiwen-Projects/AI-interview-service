import {
  Injectable,
  InternalServerErrorException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FileType } from '../interview/types';

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

  async uploadCv(file: Express.Multer.File): Promise<FileType> {
    const id = randomUUID();
    const filename = file.originalname;
    const cvBucket = this.getCvBucket();
    const { error } = await this.client.storage
      .from(cvBucket)
      .upload(`${id}.pdf`, file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `CV upload failed: ${error.message}`,
      );
    }

    return { id, name: filename };
  }

  async getCvFile(cvId: string): Promise<StreamableFile> {
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

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${filename}"`,
      length: buffer.length,
    });
  }

  async deleteCvFile(cvId: string): Promise<void> {
    const cvBucket = this.getCvBucket();
    const { error } = await this.client.storage
      .from(cvBucket)
      .remove([`${cvId}.pdf`]);

    if (error) {
      throw new InternalServerErrorException(
        `CV delete failed: ${error.message}`,
      );
    }
  }
}
