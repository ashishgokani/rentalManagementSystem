const prisma = require('../config/prisma');

class WalletService {
    async getOrCreateWallet(userId) {
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
    }

    async creditWallet(userId, amount, description, referenceType = null, referenceId = null) {
        if (amount <= 0) return null;

        const wallet = await this.getOrCreateWallet(userId);
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + amount;

        await prisma.wallet.update({
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
                referenceType,
                referenceId,
                description
            }
        });

        return transaction;
    }

    async debitWallet(userId, amount, description, referenceType = null, referenceId = null) {
        if (amount <= 0) return null;

        const wallet = await this.getOrCreateWallet(userId);
        if (wallet.balance < amount) {
            throw new Error("Insufficient balance");
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore - amount;

        await prisma.wallet.update({
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
                referenceType,
                referenceId,
                description
            }
        });

        return transaction;
    }
}

module.exports = new WalletService();
