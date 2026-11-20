import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from './logger.js';
import { describeError } from '../utils/describe-error.js';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
    logger.info('Conexión a MongoDB establecida');
  } catch (error) {
    logger.error('Falló la conexión a MongoDB', describeError(error, { includeStack: true }));
    throw error;
  }
};
