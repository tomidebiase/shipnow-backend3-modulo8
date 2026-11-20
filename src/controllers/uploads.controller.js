import { uploadsService } from '../services/uploads.service.js';

export const ensureUserForUpload = async (req, res, next) => {
  try {
    await uploadsService.ensureEntity('user', req.params.id);
    next();
  } catch (error) {
    next(error);
  }
};

export const ensureDeliveryForUpload = async (req, res, next) => {
  try {
    await uploadsService.ensureEntity('delivery', req.params.id);
    next();
  } catch (error) {
    next(error);
  }
};

export const postUserDocument = async (req, res, next) => {
  try {
    const updated = await uploadsService.attach('user', req.params.id, req.file, req.body);
    res.status(201).json({ status: 'success', payload: updated });
  } catch (error) {
    next(error);
  }
};

export const postDeliveryProof = async (req, res, next) => {
  try {
    const updated = await uploadsService.attach('delivery', req.params.id, req.file, req.body);
    res.status(201).json({ status: 'success', payload: updated });
  } catch (error) {
    next(error);
  }
};
