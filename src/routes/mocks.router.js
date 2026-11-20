import { Router } from 'express';
import { DomainError } from '../errors/domain-errors.js';
import {
  getMockUsers,
  getMockCouriers,
  getMockOrders,
  getMockDeliveries,
  getMockBundle,
  seedMockUsers,
  seedMockBundle
} from '../controllers/mocks.controller.js';

const router = Router();

router.use((req, _res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return next(new DomainError(req.method === 'GET' ? 'MOCKS_DISABLED' : 'MOCK_SEED_DISABLED'));
  }
  next();
});

router.get('/users', getMockUsers);
router.get('/couriers', getMockCouriers);
router.get('/orders', getMockOrders);
router.get('/deliveries', getMockDeliveries);
router.get('/bundle', getMockBundle);
router.post('/seed', seedMockUsers);
router.post('/seed/all', seedMockBundle);

export default router;

