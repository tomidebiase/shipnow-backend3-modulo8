import mongoose from 'mongoose';

export const fileMetadataSchema = new mongoose.Schema({
  originalName: { type: String, required: true, maxlength: 180 },
  storedName: { type: String, required: true },
  relativePath: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true, min: 1 },
  documentType: { type: String, required: true },
  uploadedAt: { type: Date, required: true }
}, { _id: false });
