const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/auth');
const {
    createQuotation,
    getQuotations,
    getQuotationById,
    updateQuotation,
    deleteQuotation
} = require('../controllers/quotation.controller');

router.use(verifyToken);

router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.post('/', createQuotation);
router.put('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);

module.exports = router;
