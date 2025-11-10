/**
 * Firebase Storage Adapter
 * Implements IStorage interface using Firebase Storage
 */

import {
  FirebaseStorage,
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
} from 'firebase/storage';
import { getFirebaseServices } from '@/lib/firebase';
import type { IStorage, UploadResult } from '../interfaces';

export class FirebaseStorageAdapter implements IStorage {
  private storage: FirebaseStorage | null = null;

  constructor() {
    // Lazy initialization
  }

  /**
   * Ensure Firebase Storage is initialized
   */
  private async ensureStorage(): Promise<FirebaseStorage> {
    if (!this.storage) {
      const services = await getFirebaseServices();
      this.storage = services.storage;
    }
    return this.storage;
  }

  async uploadFromDataURL(path: string, dataUrl: string): Promise<UploadResult> {
    const storage = await this.ensureStorage();
    const storageRef = ref(storage, path);

    await uploadString(storageRef, dataUrl, 'data_url');
    const url = await getDownloadURL(storageRef);

    return {
      url,
      path,
    };
  }

  async uploadFile(path: string, file: Blob | File): Promise<UploadResult> {
    const storage = await this.ensureStorage();
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return {
      url,
      path,
    };
  }

  async getDownloadURL(path: string): Promise<string> {
    const storage = await this.ensureStorage();
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  }

  async deleteFile(path: string): Promise<void> {
    const storage = await this.ensureStorage();
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const storage = await this.ensureStorage();
      const storageRef = ref(storage, path);
      await getMetadata(storageRef);
      return true;
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        return false;
      }
      throw error;
    }
  }

  getStorageInstance(): FirebaseStorage | null {
    return this.storage;
  }
}
