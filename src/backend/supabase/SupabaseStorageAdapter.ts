/**
 * Supabase Storage Adapter
 * Implements IStorage interface using Supabase Storage
 */

import type { IStorage, UploadResult } from '../interfaces';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

// Default bucket name - can be configured
const DEFAULT_BUCKET = 'uploads';

// Singleton Supabase client instance
let clientInstance: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 */
function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    clientInstance = createClient(url, anonKey);
  }
  return clientInstance;
}

/**
 * Convert data URL to Blob
 */
function dataURLtoBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return {
    blob: new Blob([u8arr], { type: mime }),
    contentType: mime
  };
}

export class SupabaseStorageAdapter implements IStorage {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(bucket: string = DEFAULT_BUCKET) {
    this.supabase = getSupabaseClient();
    this.bucket = bucket;
  }

  async uploadFromDataURL(path: string, dataUrl: string): Promise<UploadResult> {
    const { blob, contentType } = dataURLtoBlob(dataUrl);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, blob, {
        contentType,
        upsert: true // Allow overwriting existing files
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upload failed: No data returned');
    }

    // Get the public URL
    const url = await this.getDownloadURL(path);

    return {
      url,
      path: data.path
    };
  }

  async uploadFile(path: string, file: Blob | File): Promise<UploadResult> {
    const contentType = file instanceof File ? file.type : 'application/octet-stream';

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        contentType,
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upload failed: No data returned');
    }

    const url = await this.getDownloadURL(path);

    return {
      url,
      path: data.path
    };
  }

  async getDownloadURL(path: string): Promise<string> {
    // Get public URL for the file
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    if (!data || !data.publicUrl) {
      throw new Error('Failed to get download URL');
    }

    return data.publicUrl;
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      // Try to get file metadata
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop()
        });

      if (error) {
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  getStorageInstance(): SupabaseClient['storage'] {
    return this.supabase.storage;
  }
}
