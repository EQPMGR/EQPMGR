/**
 * Storage Provider Interface
 * Abstracts file storage operations across different backend providers
 */

export interface UploadResult {
  url: string;
  path: string;
}

export interface IStorage {
  /**
   * Upload a file from a data URL (base64)
   */
  uploadFromDataURL(path: string, dataUrl: string): Promise<UploadResult>;

  /**
   * Upload a file from a Blob or File
   */
  uploadFile(path: string, file: Blob | File): Promise<UploadResult>;

  /**
   * Get the public download URL for a file
   */
  getDownloadURL(path: string): Promise<string>;

  /**
   * Delete a file
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Check if a file exists
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Get the underlying storage instance (for framework-specific needs)
   */
  getStorageInstance(): any;
}
