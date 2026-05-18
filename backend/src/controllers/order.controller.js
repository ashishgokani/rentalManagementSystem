const prisma = require('../config/prisma');

const formatOrder = (order) => {
    // Find vendor from the first item's product
    const firstItem = order.items?.[0];
    const vendor = firstItem?.product?.vendor;
    const vendorId = vendor?.id || '';
    const vendorName = vendor ? `${vendor.firstName} ${vendor.lastName}` : (vendor?.companyName || '');

    // Calculate subtotal, tax rate, etc. from order total
    // Default tax rate to 18%
    const taxRate = 18;
    const subtotal = order.totalAmount / (1 + taxRate / 100);
    const taxAmount = order.totalAmount - subtotal;

    return {
        id: order.id,
        order_number: order.id.substring(0, 8).toUpperCase(),
        quotationId: order.quotationId,
        customerId: order.customerId,
        customer_name: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : '',
        vendorId,
        vendor_name: vendorName,
        status: order.status, // KEEP UPPERCASE matching DB/React enums
        subtotal,
        tax_rate: taxRate,
        taxAmount,
        security_deposit: 0,
        totalAmount: order.totalAmount,
        paid_amount: order.invoices?.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.totalAmount, 0) || 0,
        rental_start_date: firstItem?.startDate || null,
        rental_end_date: firstItem?.endDate || null,
        pickup_date: null,
        return_date: null,
        late_return_fee: 0,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lines: (order.items || []).map(item => ({
            id: item.id,
            productId: item.productId,
            product_name: item.product?.name || item.productName || '',
            quantity: item.quantity,
            rental_period_type: item.rentalPeriodType || 'daily',
            rental_start_date: item.startDate,
            rental_end_date: item.endDate,
            unitPrice: item.unitPrice / (item.quantity * Math.max(1, Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24)))),
            total_price: item.unitPrice
        }))
    };
};

const getOrders = async (req, res) => {
    try {
        const { status, limit = 50, skip = 0 } = req.query;
        const userId = req.user.id;
        const role = req.user.role;

        let whereClause = {};
        if (role === 'CUSTOMER') whereClause.customerId = userId;
        else if (role === 'VENDOR') whereClause.items = { some: { product: { vendorId: userId } } };

        if (status) whereClause.status = status.toUpperCase();

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: { 
                customer: true, 
                items: { include: { product: { include: { vendor: true } } } },
                invoices: true
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(skip)
        });

        res.json(orders.map(formatOrder));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { 
                customer: true, 
                items: { include: { product: { include: { vendor: true } } } }, 
                invoices: true 
            }
        });
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Access control
        const userId = req.user.id;
        if (req.user.role === 'CUSTOMER' && order.customerId !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (req.user.role === 'VENDOR') {
            const hasVendorProduct = order.items.some(item => item.product?.vendorId === userId);
            if (!hasVendorProduct) return res.status(403).json({ message: 'Unauthorized' });
        }

        res.json(formatOrder(order));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order', error: error.message });
    }
};

const createOrder = async (req, res) => {
    try {
        const { quotationId, items } = req.body;
        const customerId = req.user.id;

        let orderItems = [];
        let totalAmount = 0;

        if (quotationId) {
            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: { items: true }
            });
            if (!quotation || quotation.customerId !== customerId) {
                return res.status(404).json({ message: 'Quotation not found' });
            }
            orderItems = quotation.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                rentalPeriodType: item.rentalPeriodType,
                startDate: item.startDate,
                endDate: item.endDate,
                unitPrice: item.unitPrice
            }));
            totalAmount = quotation.totalAmount;
        } else if (items) {
            // Direct order from items
            for (const item of items) {
                const product = await prisma.product.findUnique({ where: { id: item.productId } });
                if (!product) continue;
                const start = new Date(item.startDate);
                const end = new Date(item.endDate);
                const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                const unitPrice = (product.rentalPriceDaily || 0) * days * item.quantity;
                totalAmount += unitPrice;
                orderItems.push({
                    productId: item.productId,
                    productName: product.name,
                    quantity: parseInt(item.quantity),
                    rentalPeriodType: 'daily',
                    startDate: start,
                    endDate: end,
                    unitPrice
                });
            }
        }

        const order = await prisma.order.create({
            data: {
                customerId,
                quotationId: quotationId || null,
                status: 'CONFIRMED',
                totalAmount,
                items: { create: orderItems }
            },
            include: { 
                customer: true, 
                items: { include: { product: { include: { vendor: true } } } },
                invoices: true
            }
        });

        if (quotationId) {
            await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'CONFIRMED' } });
        }

        res.status(201).json(formatOrder(order));
    } catch (error) {
        console.error('Create order error:', error);
        res.status(400).json({ message: 'Error creating order', error: error.message });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: { include: { product: true } } }
        });
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (req.user.role === 'VENDOR') {
            const hasVendorProduct = order.items.some(item => item.product?.vendorId === req.user.id);
            if (!hasVendorProduct) return res.status(403).json({ message: 'Unauthorized' });
        }

        const updated = await prisma.order.update({
            where: { id },
            data: { status: status.toUpperCase() },
            include: { 
                customer: true, 
                items: { include: { product: { include: { vendor: true } } } },
                invoices: true
            }
        });

        res.json(formatOrder(updated));
    } catch (error) {
        res.status(400).json({ message: 'Error updating order status', error: error.message });
    }
};

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus };
