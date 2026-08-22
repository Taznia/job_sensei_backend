import { FileAsset } from '../models/FileAsset.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

export const getFile = asyncHandler(async (req, res) => {
  const asset = await FileAsset.findById(req.params.id).select('+data');
  if (!asset) throw new HttpError(404, 'File not found.');
  res.setHeader('Content-Type', asset.mimeType);
  res.setHeader('Content-Length', String(asset.size));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(asset.data);
});
