import { Router } from 'express';
import { uploadDeliveryProof } from '../config/uploads.config.js';
import { ensureDeliveryForUpload, postDeliveryProof } from '../controllers/uploads.controller.js';
import { getDeliveryById } from '../controllers/deliveries.controller.js';

const router = Router();

router.get('/:id', getDeliveryById);
router.post('/:id/proofs', ensureDeliveryForUpload, uploadDeliveryProof, postDeliveryProof);

export default router;
