import multer from 'multer';

import { FileAsset } from '../models/FileAsset.js';
import { HttpError } from '../utils/httpError.js';

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const allowed =
    /^(image\/|application\/pdf|text\/plain|application\/msword|application\/vnd)/;
  if (!allowed.test(file.mimetype)) {
    cb(new HttpError(400, 'That file type is not supported.'));
    return;
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024, files: 5 },
});

export function publicFileUrl(req, id) {
  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https')
    .split(',')[0]
    .trim();
  return `${proto}://${host}/api/files/${id}`;
}

export async function persistUpload(req, file) {
  const asset = await FileAsset.create({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    data: file.buffer,
    uploadedBy: req.user?.id,
  });
  return {
    id: asset.id,
    name: file.originalname,
    kind: file.mimetype.startsWith('image/') ? 'image' : 'document',
    sizeBytes: file.size,
    url: publicFileUrl(req, asset.id),
  };
}

export async function persistUploads(req, files = []) {
  const saved = [];
  for (const file of files) {
    saved.push(await persistUpload(req, file));
  }
  return saved;
}
