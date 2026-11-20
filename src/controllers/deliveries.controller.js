import { deliveriesService } from '../services/deliveries.service.js';

export const getDeliveries = async (req, res, next) => {
  try {
    const { items, pagination } = await deliveriesService.getAll(req.query);
    res.status(200).json({ status: 'success', payload: items, pagination });
  } catch (error) {
    next(error);
  }
};

export const getDeliveryById = async (req, res, next) => {
  try {
    const delivery = await deliveriesService.getById(req.params.id);
    res.status(200).json({ status: 'success', payload: delivery });
  } catch (error) {
    next(error);
  }
};
