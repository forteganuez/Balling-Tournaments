import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { getSupabaseAdminClient } from '../lib/supabase.js';

export const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

const uploadBodySchema = z.object({
  bucket: z.enum(['avatars', 'covers']),
});

// Magic bytes for allowed image types
const FILE_SIGNATURES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF header
};

function hasValidMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;
  return signatures.some(sig => buffer.subarray(0, sig.length).equals(sig));
}

function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

function buildObjectPath(bucket: string, userId: string, extension: string): string {
  const timestamp = Date.now();

  if (bucket === 'avatars') {
    return `users/${userId}/avatar-${timestamp}.${extension}`;
  }

  return `users/${userId}/cover-${timestamp}.${extension}`;
}

uploadsRouter.post(
  '/image',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = uploadBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid upload bucket.' });
        return;
      }
      const { bucket } = parsed.data;

      if (!req.file) {
        res.status(400).json({ error: 'Image file is required.' });
        return;
      }

      if (!req.file.mimetype.startsWith('image/')) {
        res.status(400).json({ error: 'Only image uploads are supported.' });
        return;
      }

      if (!hasValidMagicBytes(req.file.buffer, req.file.mimetype)) {
        res.status(400).json({ error: 'File content does not match declared type.' });
        return;
      }

      const supabase = getSupabaseAdminClient();
      const extension = getFileExtension(req.file.mimetype);
      const path = buildObjectPath(bucket, req.user!.id, extension);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

      res.status(201).json({
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
      });
    } catch (err) {
      next(err);
    }
  },
);
