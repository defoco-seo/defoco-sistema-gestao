import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';

const s3Client = createS3Client();

/**
 * Upload a file to S3
 * @param buffer - File buffer
 * @param fileName - Name of the file
 * @param isPublic - Whether the file should be publicly accessible
 * @returns The S3 key (cloud_storage_path)
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  isPublic: boolean = false
): Promise<string> {
  const { bucketName, folderPrefix } = getBucketConfig();
  
  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Create S3 key based on public/private
  const key = isPublic
    ? `${folderPrefix}public/covers/${timestamp}-${sanitizedFileName}`
    : `${folderPrefix}covers/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: getContentType(fileName),
  });

  await s3Client.send(command);
  return key;
}

/**
 * Get URL for a file
 * @param cloud_storage_path - The S3 key
 * @param isPublic - Whether the file is publicly accessible
 * @returns URL to access the file
 */
export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean = false
): Promise<string> {
  const { bucketName } = getBucketConfig();
  
  if (isPublic) {
    // Public files can be accessed directly via HTTPS
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }
  
  // Private files need signed URLs
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });
  
  // Generate signed URL valid for 1 hour
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return signedUrl;
}

/**
 * Delete a file from S3
 * @param cloud_storage_path - The S3 key
 */
export async function deleteFile(cloud_storage_path: string): Promise<void> {
  const { bucketName } = getBucketConfig();
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });
  
  await s3Client.send(command);
}

/**
 * Get content type based on file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
    svg: 'image/svg+xml',
  };
  
  return contentTypes[ext || ''] || 'application/octet-stream';
}
