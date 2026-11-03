import {
  ServiceUnavailableException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Thin wrapper around S3 for product/review images and invoice PDFs.
 *
 * The client is only constructed when AWS_* env vars are configured, so the
 * app still boots in dev — file endpoints then fail with a clear 503 instead
 * of a cryptic SDK error.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('AWS_S3_BUCKET', '') ?? '';
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID', '') ?? '';
    const secretAccessKey =
      config.get<string>('AWS_SECRET_ACCESS_KEY', '') ?? '';
    const region =
      config.get<string>('AWS_S3_REGION', 'ap-south-1') ?? 'ap-south-1';
    const publicUrl = config.get<string>('AWS_S3_PUBLIC_URL', '') ?? '';

    if (this.bucket && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.client = null;
    }

    this.publicBase = publicUrl
      ? publicUrl.replace(/\/+$/, '')
      : `https://${this.bucket}.s3.${region}.amazonaws.com`;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async upload(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<UploadResult> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'File storage is not configured (AWS_S3_BUCKET / AWS credentials missing)',
      );
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return { key: params.key, url: `${this.publicBase}/${params.key}` };
  }

  /** Best-effort remote delete — never blocks the DB cleanup that follows. */
  async remove(url: string): Promise<void> {
    const key = this.keyFromUrl(url);
    if (!this.client || !key) return;

    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to delete s3://${key}: ${(err as Error).message}`,
      );
    }
  }

  /** Recover the object key from a previously stored public URL. */
  keyFromUrl(url: string): string | null {
    if (!url || !this.bucket) return null;
    const marker = `/${this.bucket}/`;
    const index = url.indexOf(marker);
    if (index >= 0) return decodeURIComponent(url.slice(index + marker.length));
    if (url.startsWith(`${this.publicBase}/`)) {
      return decodeURIComponent(url.slice(this.publicBase.length + 1));
    }
    return null;
  }
}
