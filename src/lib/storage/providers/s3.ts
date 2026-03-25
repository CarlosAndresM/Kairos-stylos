// S3StorageProvider.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { IStorageProvider } from './types';

export class S3StorageProvider implements IStorageProvider {
    private client: S3Client;
    private bucket: string;
    private endpoint: string;

    constructor() {
        this.endpoint = process.env.DO_SPACES_ENDPOINT || '';
        this.bucket = process.env.DO_SPACES_BUCKET || '';

        this.client = new S3Client({
            endpoint: this.endpoint.startsWith('http') ? this.endpoint : `https://${this.endpoint}`,
            region: 'us-east-1', // DO ignores region but it's required by the SDK
            credentials: {
                accessKeyId: process.env.DO_SPACES_KEY || '',
                secretAccessKey: process.env.DO_SPACES_SECRET || '',
            },
        });
    }

    async upload(file: Buffer, fileName: string, folder: string): Promise<string> {
        const key = `${folder}/${fileName}`.replace(/\/+/g, '/');

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file,
            ACL: 'public-read',
            ContentType: this.getContentType(fileName),
        }));

        return this.getPublicUrl(key);
    }

    async delete(url: string): Promise<void> {
        const key = this.getKeyFromUrl(url);
        if (!key) return;

        await this.client.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
    }

    async move(tempUrl: string, destinationFolder: string): Promise<string> {
        const oldKey = this.getKeyFromUrl(tempUrl);
        if (!oldKey || !oldKey.includes('/temp/')) return tempUrl;

        const fileName = oldKey.split('/').pop() || '';
        const newKey = `${destinationFolder}/${fileName}`.replace(/\/+/g, '/');

        // Copy object to new location
        await this.client.send(new CopyObjectCommand({
            Bucket: this.bucket,
            CopySource: `/${this.bucket}/${oldKey}`,
            Key: newKey,
            ACL: 'public-read',
        }));

        // Delete old object
        await this.delete(tempUrl);

        return this.getPublicUrl(newKey);
    }

    getPublicUrl(key: string): string {
        // Construct the DO Spaces URL
        // Example: https://bucket.endpoint/key
        const cleanEndpoint = this.endpoint.replace(/^https?:\/\//, '');
        return `https://${this.bucket}.${cleanEndpoint}/${key}`;
    }

    private getKeyFromUrl(url: string): string | null {
        try {
            const cleanEndpoint = this.endpoint.replace(/^https?:\/\//, '');
            const baseUrl = `${this.bucket}.${cleanEndpoint}`;
            if (url.includes(baseUrl)) {
                return url.split(baseUrl)[1].substring(1);
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    private getContentType(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'pdf': return 'application/pdf';
            default: return 'application/octet-stream';
        }
    }
}
