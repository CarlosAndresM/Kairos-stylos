// IStorageProvider.ts
export interface IStorageProvider {
    upload(file: Buffer, fileName: string, folder: string): Promise<string>;
    delete(url: string): Promise<void>;
    move(tempUrl: string, destinationFolder: string): Promise<string>;
    getPublicUrl(url: string): string;
}

export enum StorageType {
    LOCAL = 'local',
    S3 = 's3'
}
