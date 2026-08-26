import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, enum: ['image', 'document'], required: true },
    sizeBytes: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { timestamps: false },
);

const commentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    author: { type: String, required: true },
    body: { type: String, required: true, maxlength: 1000 },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true },
);

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    author: { type: String, required: true },
    role: { type: String, default: 'Job Sensei member' },
    body: { type: String, required: true, maxlength: 4000 },
    tags: { type: [String], default: [] },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
    attachments: { type: [attachmentSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

export const Post = mongoose.model('Post', postSchema);
