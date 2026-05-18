const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/auth');
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    getInvoiceByOrder,
    addPayment,
    getInvoicePayments
} = require('../controllers/invoice.controller');

router.use(verifyToken);

router.get('/', getInvoices);
router.get('/order/:order_id', getInvoiceByOrder);
router.get('/:id', getInvoiceById);
router.post('/', createInvoice);
router.post('/:id/payments', addPayment);
router.get('/:id/payments', getInvoicePayments);

module.exports = router;
