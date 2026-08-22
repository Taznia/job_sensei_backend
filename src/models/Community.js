import mongoose from 'mongoose';

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 45 },
    description: { type: String, required: true, maxlength: 400 },
    category: { type: String, required: true },
    visualKey: { type: String, required: true, default: 'code' },
    privacy: { type: String, enum: ['public', 'private'], default: 'public' },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

communitySchema.virtual('memberCount').get(function memberCount() {
  return this.members?.length || 0;
});

communitySchema.set('toJSON', { virtuals: true });
communitySchema.set('toObject', { virtuals: true });

export const Community = mongoose.model('Community', communitySchema);
