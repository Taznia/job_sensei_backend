import mongoose from 'mongoose';

const fileAssetSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const FileAsset = mongoose.model('FileAsset', fileAssetSchema);
