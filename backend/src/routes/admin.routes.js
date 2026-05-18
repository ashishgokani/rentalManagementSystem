const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/auth');
const {
    getUsers, getUser, createUser, updateUserStatus, updateUserRole, deleteUser,
    getVendors, approveVendor,
    getWallets, getWalletStats, getTransactions, adjustWallet,
    getDashboardStats,
    getCoupons, createCoupon, updateCoupon, deleteCoupon, toggleCoupon
} = require('../controllers/admin.controller');

router.use(verifyToken);
router.use(verifyRole(['ADMIN']));

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.post('/users', createUser);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Vendors
router.get('/vendors', getVendors);
router.post('/vendors/:id/approve', approveVendor);

// Wallets
router.get('/wallets', getWallets);
router.get('/wallets/stats', getWalletStats);
router.post('/wallets/adjust', adjustWallet);

// Transactions
router.get('/transactions', getTransactions);

// Coupons
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);
router.post('/coupons/:id/toggle', toggleCoupon);

module.exports = router;
