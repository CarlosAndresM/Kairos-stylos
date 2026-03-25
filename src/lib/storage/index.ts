// storage/index.ts
import { IStorageProvider, StorageType } from './types';
import { LocalStorageProvider } from './providers/local';
import { S3StorageProvider } from './providers/s3';

let storageProvider: IStorageProvider;

export function getStorageProvider(): IStorageProvider {
    if (storageProvider) return storageProvider;

    const type = process.env.STORAGE_TYPE as StorageType || StorageType.S3;

    if (type === StorageType.LOCAL && process.env.NODE_ENV === 'production') {
        throw new Error('Local storage is not allowed in production (Serverless environment)');
    }

    switch (type) {
        case StorageType.S3:
            storageProvider = new S3StorageProvider();
            break;
        case StorageType.LOCAL:
            storageProvider = new LocalStorageProvider();
            break;
        default:
            throw new Error(`Invalid storage type: ${type}`);
    }

    return storageProvider;
}
