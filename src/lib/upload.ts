// src/lib/upload.ts

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Upload file to local storage
 * @param file - File to upload
 * @param folder - Folder name (menu, categories, profiles)
 * @returns Public URL of uploaded file
 */
export async function uploadFile(
  file: File,
  folder: 'menu' | 'categories' | 'profiles'
): Promise<string> {
  try {
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${randomString}.${extension}`;

    // Create directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Write file
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Return public URL
    return `/uploads/${folder}/${filename}`;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Delete file from local storage
 * @param fileUrl - Public URL of file to delete
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    const { unlink } = await import('fs/promises');
    const filepath = join(process.cwd(), 'public', fileUrl);
    
    if (existsSync(filepath)) {
      await unlink(filepath);
    }
  } catch (error) {
    console.error('Delete error:', error);
    // Don't throw - file might already be deleted
  }
}