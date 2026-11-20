import mongoose from 'mongoose';
import { USER_ROLES } from '../constants/index.js';
import { fileMetadataSchema } from './file-metadata.schema.js';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
      required: true
    },
    documents: { type: [fileMetadataSchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ createdAt: -1, _id: -1 });

export default mongoose.model('User', userSchema);
