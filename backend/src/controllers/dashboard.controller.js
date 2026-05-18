const prisma = require('../config/prisma');

const getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let totalOrders = 0;
        let activeRentals = 0;
        let pendingReturns = 0;
        let totalRevenue = 0;
        let totalProducts = 0;
        let topProducts = [];
        let revenueByMonth = [];
        let ordersByStatus = [];

        if (role === 'ADMIN') {
            totalOrders = await prisma.order.count();
            activeRentals = await prisma.order.count({ where: { status: 'ACTIVE' } });
            pendingReturns = await prisma.order.count({ where: { status: 'RETURNED' } });
            totalProducts = await prisma.product.count();

            const invoices = await prisma.invoice.findMany({ where: { status: 'PAID' } });
            totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);

        } else if (role === 'VENDOR') {
            totalProducts = await prisma.product.count({ where: { vendorId: userId } });

            const vendorOrders = await prisma.order.findMany({
                where: { items: { some: { product: { vendorId: userId } } } }
            });
            totalOrders = vendorOrders.length;
            activeRentals = vendorOrders.filter(o => o.status === 'ACTIVE').length;
            pendingReturns = vendorOrders.filter(o => o.status === 'RETURNED').length;

            const vendorInvoices = await prisma.invoice.findMany({
                where: {
                    status: 'PAID',
                    order: { items: { some: { product: { vendorId: userId } } } }
                }
            });
            totalRevenue = vendorInvoices.reduce((sum, inv) => sum + inv.amount, 0);

        } else {
            // CUSTOMER
            totalOrders = await prisma.order.count({ where: { customerId: userId } });
            activeRentals = await prisma.order.count({ where: { customerId: userId, status: 'ACTIVE' } });
            pendingReturns = await prisma.order.count({ where: { customerId: userId, status: 'RETURNED' } });
        }

        // Top products by order count
        const topProductsRaw = await prisma.orderLine.groupBy({
            by: ['productId'],
            _count: { productId: true },
            orderBy: { _count: { productId: 'desc' } },
            take: 5,
            where: role === 'VENDOR' ? { product: { vendorId: userId } } : {}
        });

        for (const item of topProductsRaw) {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            if (product) {
                topProducts.push({ name: product.name, rentals: item._count.productId });
            }
        }

        // Revenue by month (last 6 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = new Date(d.getFullYear(), d.getMonth(), 1);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            const invoices = await prisma.invoice.findMany({
                where: {
                    status: 'PAID',
                    issuedAt: { gte: start, lte: end }
                }
            });
            const revenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
            revenueByMonth.push({ month: months[d.getMonth()], revenue });
        }

        // Orders by status
        const statuses = ['DRAFT', 'CONFIRMED', 'ACTIVE', 'RETURNED', 'COMPLETED', 'CANCELLED'];
        for (const status of statuses) {
            const whereClause = { status };
            if (role === 'CUSTOMER') whereClause.customerId = userId;
            else if (role === 'VENDOR') whereClause.items = { some: { product: { vendorId: userId } } };
            const count = await prisma.order.count({ where: whereClause });
            if (count > 0) {
                ordersByStatus.push({ status: status.toLowerCase(), count });
            }
        }

        res.json({
            total_revenue: totalRevenue,
            total_orders: totalOrders,
            active_rentals: activeRentals,
            pending_returns: pendingReturns,
            total_products: totalProducts,
            top_products: topProducts,
            revenue_by_month: revenueByMonth,
            orders_by_status: ordersByStatus
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

const getRecentOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const limit = parseInt(req.query.limit) || 5;

        let whereClause = {};
        if (role === 'CUSTOMER') whereClause.customerId = userId;
        else if (role === 'VENDOR') whereClause.items = { some: { product: { vendorId: userId } } };

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: { customer: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        const result = orders.map(o => ({
            id: o.id,
            order_number: o.id.substring(0, 8).toUpperCase(),
            customer_name: `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim(),
            status: o.status.toLowerCase(),
            totalAmount: o.totalAmount,
            createdAt: o.createdAt,
            rental_start_date: o.items[0]?.startDate || null,
            rental_end_date: o.items[0]?.endDate || null
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent orders', error: error.message });
    }
};

const getVendorPerformance = async (req, res) => {
    try {
        const vendors = await prisma.user.findMany({ where: { role: 'VENDOR' } });
        const result = [];

        for (const vendor of vendors) {
            const totalProducts = await prisma.product.count({ where: { vendorId: vendor.id } });
            const orders = await prisma.order.count({
                where: { items: { some: { product: { vendorId: vendor.id } } } }
            });
            const invoices = await prisma.invoice.findMany({
                where: { status: 'PAID', order: { items: { some: { product: { vendorId: vendor.id } } } } }
            });
            const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
            result.push({
                vendorId: vendor.id,
                vendor_name: `${vendor.firstName} ${vendor.lastName}`,
                total_orders: orders,
                total_revenue: totalRevenue,
                total_products: totalProducts,
                avg_order_value: orders > 0 ? totalRevenue / orders : 0
            });
        }

        result.sort((a, b) => b.total_revenue - a.total_revenue);
        res.json(result.slice(0, 10));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vendor performance', error: error.message });
    }
};

const getWeeklyStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const result = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
            const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

            let whereClause = { createdAt: { gte: start, lte: end } };
            if (role === 'CUSTOMER') whereClause.customerId = userId;
            else if (role === 'VENDOR') whereClause.items = { some: { product: { vendorId: userId } } };

            const orders = await prisma.order.count({ where: whereClause });
            const invoices = await prisma.invoice.findMany({
                where: { status: 'PAID', issuedAt: { gte: start, lte: end } }
            });
            const revenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);

            result.push({
                date: start.toISOString().split('T')[0],
                day_name: dayNames[d.getDay()],
                orders,
                revenue
            });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching weekly stats', error: error.message });
    }
};

const getCategoryDistribution = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        const categories = await prisma.category.findMany({ where: { isActive: true } });
        const result = [];
        let totalRevenue = 0;

        for (const cat of categories) {
            const productWhere = { categoryId: cat.id };
            if (role === 'VENDOR') productWhere.vendorId = userId;

            const productCount = await prisma.product.count({ where: productWhere });
            const lines = await prisma.orderLine.findMany({
                where: { product: { categoryId: cat.id, ...(role === 'VENDOR' ? { vendorId: userId } : {}) } }
            });
            const orderCount = lines.length;
            const revenue = lines.reduce((sum, l) => sum + l.unitPrice, 0);
            totalRevenue += revenue;

            result.push({
                categoryId: cat.id,
                category_name: cat.name,
                product_count: productCount,
                order_count: orderCount,
                revenue,
                percentage: 0
            });
        }

        result.forEach(item => {
            item.percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
        });

        result.sort((a, b) => b.revenue - a.revenue);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching category distribution', error: error.message });
    }
};

module.exports = {
    getStats,
    getRecentOrders,
    getVendorPerformance,
    getWeeklyStats,
    getCategoryDistribution
};
