import { Router } from 'express';
import { uploadUserDocument } from '../config/uploads.config.js';
import { ensureUserForUpload, postUserDocument } from '../controllers/uploads.controller.js';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/users.controller.js';

const router = Router();

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/documents', ensureUserForUpload, uploadUserDocument, postUserDocument);

export default router;
