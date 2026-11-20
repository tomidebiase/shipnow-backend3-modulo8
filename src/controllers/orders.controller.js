import { ordersService } from '../services/orders.service.js';

export const getOrders = async (req, res, next) => {
  try {
    const { items, pagination } = await ordersService.getAll(req.query);
    res.status(200).json({ status: 'success', payload: items, pagination });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await ordersService.getById(req.params.id);
    res.status(200).json({ status: 'success', payload: order });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const order = await ordersService.create(req.body);
    res.status(201).json({ status: 'success', payload: order });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await ordersService.updateStatus(req.params.id, req.body);
    res.status(200).json({ status: 'success', payload: order });
  } catch (error) {
    next(error);
  }
};
