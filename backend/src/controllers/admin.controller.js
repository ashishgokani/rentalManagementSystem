const prisma = require('../config/prisma');

// =====================
// Users Management
// =====================

const getUsers = async (req, res) => {
    try {
        const { page = 1, per_page = 20, search, role, isActive } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(per_page);

        let whereClause = {};
        if (search) {
            whereClause.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (role) whereClause.role = role.toUpperCase();
        if (isActive !== undefined) whereClause.isActive = isActive === 'true';

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                select: {
                    id: true, firstName: true, lastName: true, email: true,
                    role: true, companyName: true, businessCategory: true,
                    gstin: true, isActive: true, createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(per_page)
            }),
            prisma.user.count({ where: whereClause })
        ]);

        res.json({
            items: users,
            total,
            page: parseInt(page),
            per_page: parseInt(per_page),
            total_pages: Math.ceil(total / parseInt(per_page))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

const getUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true, firstName: true, lastName: true, email: true,
                role: true, companyName: true, businessCategory: true,
                gstin: true, isActive: true, createdAt: true, phone: true,
                address: true, city: true, state: true
            }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { firstName, lastName, email, password, role, companyName, businessCategory, gstin } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { firstName, lastName, email, passwordHash, role: role || 'CUSTOMER', companyName, businessCategory, gstin }
        });

        await prisma.wallet.create({ data: { userId: user.id } });
        res.status(201).json({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, isActive: user.isActive });
    } catch (error) {
        res.status(400).json({ message: 'Error creating user', error: error.message });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const user = await prisma.user.update({ where: { id }, data: { isActive } });
        res.json({ id: user.id, isActive: user.isActive, message: 'User status updated' });
    } catch (error) {
        res.status(400).json({ message: 'Error updating user status', error: error.message });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const user = await prisma.user.update({ where: { id }, data: { role: role.toUpperCase() } });
        res.json({ id: user.id, role: user.role, message: 'User role updated' });
    } catch (error) {
        res.status(400).json({ message: 'Error updating user role', error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting user', error: error.message });
    }
};

// =====================
// Vendors
// =====================

const getVendors = async (req, res) => {
    try {
        const { page = 1, per_page = 20, search, isActive } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(per_page);

        let whereClause = { role: 'VENDOR' };
        if (search) {
            whereClause.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (isActive !== undefined) whereClause.isActive = isActive === 'true';

        const [vendors, total] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                select: { id: true, firstName: true, lastName: true, email: true, companyName: true, isActive: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(per_page)
            }),
            prisma.user.count({ where: whereClause })
        ]);

        res.json({ items: vendors, total, page: parseInt(page), per_page: parseInt(per_page), total_pages: Math.ceil(total / parseInt(per_page)) });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vendors', error: error.message });
    }
};

const approveVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;
        await prisma.user.update({ where: { id }, data: { isActive: approved } });
        res.json({ message: approved ? 'Vendor approved' : 'Vendor rejected' });
    } catch (error) {
        res.status(400).json({ message: 'Error approving vendor', error: error.message });
    }
};

// =====================
// Wallet Management
// =====================

const getWallets = async (req, res) => {
    try {
        const { search } = req.query;
        let whereClause = {};
        if (search) {
            whereClause.user = {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const wallets = await prisma.wallet.findMany({
            where: whereClause,
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(wallets.map(w => ({
            id: w.id,
            user_id: w.userId,
            user_name: `${w.user.firstName} ${w.user.lastName}`,
            user_email: w.user.email,
            balance: w.balance,
            currency: w.currency,
            isActive: true,
            createdAt: w.createdAt
        })));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wallets', error: error.message });
    }
};

const getWalletStats = async (req, res) => {
    try {
        const wallets = await prisma.wallet.findMany();
        const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
        res.json({
            total_wallets: wallets.length,
            total_balance: totalBalance,
            total_credited: totalBalance,
            total_debited: 0,
            active_wallets: wallets.length,
            transactions_today: 0,
            transactions_this_month: 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wallet stats', error: error.message });
    }
};

const getTransactions = async (req, res) => {
    try {
        // Return empty array for now - transactions can be implemented later
        res.json([]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};

const adjustWallet = async (req, res) => {
    try {
        const { user_id, amount, transaction_type, description } = req.body;
        const increment = transaction_type === 'credit' ? amount : -amount;

        const wallet = await prisma.wallet.update({
            where: { userId: user_id },
            data: { balance: { increment } }
        });

        res.json({ message: 'Wallet adjusted successfully', new_balance: wallet.balance, transaction_id: `txn_${Date.now()}` });
    } catch (error) {
        res.status(400).json({ message: 'Error adjusting wallet', error: error.message });
    }
};

// =====================
// Dashboard Stats
// =====================

const getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, totalVendors, totalCustomers] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'VENDOR' } }),
            prisma.user.count({ where: { role: 'CUSTOMER' } })
        ]);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [newUsersThisMonth, newVendorsThisMonth] = await Promise.all([
            prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.user.count({ where: { role: 'VENDOR', createdAt: { gte: startOfMonth } } })
        ]);

        res.json({
            total_users: totalUsers,
            total_vendors: totalVendors,
            total_customers: totalCustomers,
            active_users: totalUsers,
            new_users_this_month: newUsersThisMonth,
            new_vendors_this_month: newVendorsThisMonth
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
    }
};

// =====================
// Coupons (stub)
// =====================
const getCoupons = async (req, res) => res.json({ coupons: [], total: 0, page: 1, page_size: 20 });
const createCoupon = async (req, res) => res.status(201).json({ id: `coupon_${Date.now()}`, ...req.body, usage_count: 0, isActive: true, createdAt: new Date() });
const updateCoupon = async (req, res) => res.json({ id: req.params.id, ...req.body });
const deleteCoupon = async (req, res) => res.json({ message: 'Coupon deleted' });
const toggleCoupon = async (req, res) => res.json({ message: 'Coupon toggled', isActive: true });

module.exports = {
    getUsers, getUser, createUser, updateUserStatus, updateUserRole, deleteUser,
    getVendors, approveVendor,
    getWallets, getWalletStats, getTransactions, adjustWallet,
    getDashboardStats,
    getCoupons, createCoupon, updateCoupon, deleteCoupon, toggleCoupon
};
