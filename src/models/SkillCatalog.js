import mongoose from 'mongoose';

const skillItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    requiredLevel: { type: Number, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    impact: { type: String, required: true },
  },
  { _id: false },
);

const skillCatalogSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true },
  skills: { type: [skillItemSchema], default: [] },
});

export const SkillCatalog = mongoose.model('SkillCatalog', skillCatalogSchema);
