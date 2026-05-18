const prisma = require('../config/prisma');

const formatWallet = (wallet) => ({
    id: wallet.id,
    user_id: wallet.userId,
    balance: wallet.balance,
    currency: wallet.currency,
    isActive: wallet.isActive,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt
});

const formatTransaction = (txn) => ({
    id: txn.id,
    wallet_id: txn.walletId,
    transaction_type: txn.transactionType,
    amount: txn.amount,
    balance_before: txn.balanceBefore,
    balance_after: txn.balanceAfter,
    status: txn.status,
    reference_type: txn.referenceType,
    reference_id: txn.referenceId,
    description: txn.description,
    payment_method: txn.paymentMethod,
    external_reference: txn.externalReference,
    created_at: txn.createdAt
});

const getOrCreateWallet = async (userId) => {
    let wallet = await prisma.wallet.findUnique({
        where: { userId }
    });
    if (!wallet) {
        wallet = await prisma.wallet.create({
            data: {
                userId,
                balance: 0.0,
                currency: "INR",
                isActive: true
            }
        });
    }
    return wallet;
};

const getWallet = async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user.id);
        res.json(formatWallet(wallet));
    } catch (error) {
        res.status(500).json({ message: "Error fetching wallet", error: error.message });
    }
};

const getWalletSummary = async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user.id);

        const recentTransactions = await prisma.walletTransaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const creditAggregation = await prisma.walletTransaction.aggregate({
            _sum: { amount: true },
            where: {
                walletId: wallet.id,
                transactionType: 'CREDIT',
                status: 'COMPLETED'
            }
        });

        const debitAggregation = await prisma.walletTransaction.aggregate({
            _sum: { amount: true },
            where: {
                walletId: wallet.id,
                transactionType: 'DEBIT',
                status: 'COMPLETED'
            }
        });

        const totalCredited = creditAggregation._sum.amount || 0;
        const totalDebited = debitAggregation._sum.amount || 0;

        res.json({
            wallet: formatWallet(wallet),
            recent_transactions: recentTransactions.map(formatTransaction),
            total_credited: totalCredited,
            total_debited: totalDebited
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching wallet summary", error: error.message });
    }
};

const getTransactions = async (req, res) => {
    try {
        const { skip = 0, limit = 20, transaction_type } = req.query;
        const wallet = await getOrCreateWallet(req.user.id);

        let whereClause = { walletId: wallet.id };
        if (transaction_type) {
            whereClause.transactionType = transaction_type.toUpperCase();
        }

        const transactions = await prisma.walletTransaction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: parseInt(skip),
            take: parseInt(limit)
        });

        res.json(transactions.map(formatTransaction));
    } catch (error) {
        res.status(500).json({ message: "Error fetching transactions", error: error.message });
    }
};

const addFunds = async (req, res) => {
    try {
        const { amount, payment_method, external_reference } = req.body;
        if (amount <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });

        const wallet = await getOrCreateWallet(req.user.id);
        if (!wallet.isActive) return res.status(400).json({ message: "Wallet is inactive" });

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + amount;

        const updatedWallet = await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: balanceAfter }
        });

        const transaction = await prisma.walletTransaction.create({
            data: {
                walletId: wallet.id,
                transactionType: 'CREDIT',
                amount,
                balanceBefore,
                balanceAfter,
                status: 'COMPLETED',
                referenceType: 'TOPUP',
                description: `Added funds via ${payment_method}`,
                paymentMethod: payment_method,
                externalReference: external_reference
            }
        });

        res.status(201).json(formatTransaction(transaction));
    } catch (error) {
        res.status(400).json({ message: "Error adding funds", error: error.message });
    }
};

const withdrawFunds = async (req, res) => {
    try {
        const { amount, description } = req.body;
        if (amount <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });

        const wallet = await getOrCreateWallet(req.user.id);
        if (!wallet.isActive) return res.status(400).json({ message: "Wallet is inactive" });
        if (wallet.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore - amount;

        const updatedWallet = await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: balanceAfter }
        });

        const transaction = await prisma.walletTransaction.create({
            data: {
                walletId: wallet.id,
                transactionType: 'DEBIT',
                amount,
                balanceBefore,
                balanceAfter,
                status: 'COMPLETED',
                referenceType: 'WITHDRAWAL',
                description: description || "Withdrawal request"
            }
        });

        res.status(201).json(formatTransaction(transaction));
    } catch (error) {
        res.status(400).json({ message: "Error withdrawing funds", error: error.message });
    }
};

const getTransaction = async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user.id);
        const transaction = await prisma.walletTransaction.findFirst({
            where: {
                id: req.params.transaction_id,
                walletId: wallet.id
            }
        });

        if (!transaction) return res.status(404).json({ message: "Transaction not found" });

        res.json(formatTransaction(transaction));
    } catch (error) {
        res.status(500).json({ message: "Error fetching transaction", error: error.message });
    }
};

module.exports = {
    getWallet,
    getWalletSummary,
    getTransactions,
    addFunds,
    withdrawFunds,
    getTransaction
};
