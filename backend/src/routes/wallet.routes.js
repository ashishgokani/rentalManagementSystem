const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', walletController.getWallet);
router.get('/summary', walletController.getWalletSummary);
router.get('/transactions', walletController.getTransactions);
router.post('/add-funds', walletController.addFunds);
router.post('/withdraw', walletController.withdrawFunds);
router.get('/transactions/:transaction_id', walletController.getTransaction);

module.exports = router;
