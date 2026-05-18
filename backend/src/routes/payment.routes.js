const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.post('/create', paymentController.createPaymentOrder);
router.post('/verify', paymentController.verifyPayment);

module.exports = router;
