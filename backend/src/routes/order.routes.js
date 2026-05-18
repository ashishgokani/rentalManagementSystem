const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/auth');
const { getOrders, getOrderById, createOrder, updateOrderStatus } = require('../controllers/order.controller');

router.use(verifyToken);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', verifyRole(['CUSTOMER']), createOrder);
router.patch('/:id/status', verifyRole(['VENDOR', 'ADMIN']), updateOrderStatus);

module.exports = router;
