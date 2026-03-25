// LocalStorageProvider.ts
import { rename, unlink, mkdir, writeFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { IStorageProvider } from './types';

export class LocalStorageProvider implements IStorageProvider {
    private publicDir = join(process.cwd(), 'public');

    async upload(file: Buffer, fileName: string, folder: string): Promise<string> {
        const relativePath = join('uploads', folder, fileName);
        const absolutePath = join(this.publicDir, relativePath);
        
        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, file);
        
        return `/${relativePath.replace(/\\/g, '/')}`;
    }

    async delete(url: string): Promise<void> {
        const absolutePath = join(this.publicDir, url);
        try {
            await access(absolutePath);
            await unlink(absolutePath);
        } catch (error) {
            // File doesn't exist, ignore
        }
    }

    async move(tempUrl: string, destinationFolder: string): Promise<string> {
        if (!tempUrl.includes('/temp/')) return tempUrl;

        const fileName = tempUrl.split('/').pop() || '';
        const oldPath = join(this.publicDir, tempUrl);
        
        const relativePath = join('uploads', destinationFolder, fileName);
        const newPath = join(this.publicDir, relativePath);

        await mkdir(dirname(newPath), { recursive: true });
        await rename(oldPath, newPath);

        return `/${relativePath.replace(/\\/g, '/')}`;
    }

    getPublicUrl(url: string): string {
        return url;
    }
}
