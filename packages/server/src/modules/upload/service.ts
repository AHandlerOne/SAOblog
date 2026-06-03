import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { prisma } from '../../lib/prisma.js'
import { uploadRoot } from '../../config/index.js'

// Magic bytes for image type detection
const IMAGE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF - need further check for WEBP
}

/**
 * Validate file type by checking magic bytes against known image signatures.
 */
export function validateFileType(buffer: Buffer): string | null {
  // Check JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === IMAGE_SIGNATURES['image/jpeg'][0] &&
    buffer[1] === IMAGE_SIGNATURES['image/jpeg'][1] &&
    buffer[2] === IMAGE_SIGNATURES['image/jpeg'][2]
  ) {
    return 'image/jpeg'
  }

  // Check PNG
  if (buffer.length >= 8) {
    const isPng = IMAGE_SIGNATURES['image/png'].every((byte, i) => buffer[i] === byte)
    if (isPng) return 'image/png'
  }

  // Check WebP (RIFF....WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50   // P
  ) {
    return 'image/webp'
  }

  return null
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

/**
 * Process an uploaded image: compress, generate thumbnail, strip EXIF, convert to WebP.
 * This is called by the BullMQ worker.
 */
export async function processImage(fileId: number): Promise<void> {
  const record = await prisma.uploadRecord.findUnique({ where: { id: fileId } })
  if (!record) {
    throw new Error(`Upload record ${fileId} not found`)
  }

  await prisma.uploadRecord.update({
    where: { id: fileId },
    data: { status: 'PROCESSING' },
  })

  const uploadDir = uploadRoot
  const privateDir = path.join(uploadDir, 'private')
  const publicDir = path.join(uploadDir, 'public')
  const thumbDir = path.join(publicDir, 'thumbnails')

  await ensureDir(publicDir)
  await ensureDir(thumbDir)

  const rawPath = path.join(privateDir, record.filename)
  const fileBuffer = await fs.readFile(rawPath)

  // Detect actual MIME type from magic bytes
  const detectedMime = validateFileType(fileBuffer)
  if (!detectedMime) {
    throw new Error(`Unsupported image format for file ${record.filename}`)
  }

  // Process with Sharp: strip EXIF, convert to WebP, compress
  const processedBuffer = await sharp(fileBuffer)
    .rotate() // Auto-rotate based on EXIF orientation, then strip
    .webp({
      quality: 82,
      effort: 4,
    })
    .toBuffer()

  // Generate thumbnail (max 400px on longest side)
  const thumbnailBuffer = await sharp(fileBuffer)
    .rotate()
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .webp({
      quality: 70,
      effort: 4,
    })
    .toBuffer()

  // Build unique filename to avoid collisions
  const uniqueId = record.id.toString()
  const webpFilename = `${uniqueId}.webp`
  const thumbFilename = `${uniqueId}_thumb.webp`

  const publicFilePath = path.join(publicDir, webpFilename)
  const thumbFilePath = path.join(thumbDir, thumbFilename)

  // Write processed files
  await fs.writeFile(publicFilePath, processedBuffer)
  await fs.writeFile(thumbFilePath, thumbnailBuffer)

  // Remove the original private file
  try {
    await fs.unlink(rawPath)
  } catch {
    // File might already be deleted; ignore
  }

  // Get image metadata
  const metadata = await sharp(processedBuffer).metadata()

  // Update DB record
  await prisma.uploadRecord.update({
    where: { id: fileId },
    data: {
      status: 'READY',
      url: `/api/uploads/public/${webpFilename}`,
      thumbnailUrl: `/api/uploads/public/thumbnails/${thumbFilename}`,
      width: metadata.width,
      height: metadata.height,
      size: processedBuffer.length,
      mimeType: 'image/webp',
    },
  })
}
