const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/auth');
const {
    getStats,
    getRecentOrders,
    getVendorPerformance,
    getWeeklyStats,
    getCategoryDistribution
} = require('../controllers/dashboard.controller');

router.use(verifyToken);

router.get('/stats', getStats);
router.get('/recent-orders', getRecentOrders);
router.get('/reports/vendor-performance', verifyRole(['ADMIN', 'VENDOR']), getVendorPerformance);
router.get('/reports/weekly-stats', getWeeklyStats);
router.get('/reports/category-distribution', getWeeklyStats);

module.exports = router;
