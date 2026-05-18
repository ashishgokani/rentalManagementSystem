const prisma = require('../config/prisma');

const generateInvoiceNumber = () => {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${timestamp}-${randomSuffix}`;
};

const formatInvoice = (invoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    orderId: invoice.orderId,
    customerId: invoice.customerId,
    customer_name: invoice.customer ? `${invoice.customer.firstName} ${invoice.customer.lastName}` : '',
    customer_gstin: invoice.customer ? invoice.customer.gstin : null,
    status: invoice.status,
    subtotal: invoice.subtotal,
    tax_rate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    paid_amount: invoice.paidAmount,
    due_date: invoice.dueDate,
    createdAt: invoice.issuedAt || invoice.createdAt,
    updatedAt: invoice.updatedAt,
    lines: (invoice.lines || []).map(line => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total_price: line.totalPrice
    }))
});

const getInvoices = async (req, res) => {
    try {
        const { status, limit = 50, skip = 0 } = req.query;
        let whereClause = {};

        if (req.user.role === 'CUSTOMER') {
            whereClause.customerId = req.user.id;
        } else if (req.user.role === 'VENDOR') {
            whereClause.order = { items: { some: { product: { vendorId: req.user.id } } } };
        }

        if (status) {
            whereClause.status = status.toUpperCase();
        }

        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            include: { customer: true, lines: true },
            orderBy: { issuedAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(skip)
        });

        res.json(invoices.map(formatInvoice));
    } catch (error) {
        res.status(500).json({ message: "Error fetching invoices", error: error.message });
    }
};

const getInvoiceById = async (req, res) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: { customer: true, lines: true }
        });

        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        if (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (req.user.role === 'VENDOR') {
            const hasVendorProduct = await prisma.order.findFirst({
                where: { id: invoice.orderId, items: { some: { product: { vendorId: req.user.id } } } }
            });
            if (!hasVendorProduct) return res.status(403).json({ message: "Not authorized" });
        }

        res.json(formatInvoice(invoice));
    } catch (error) {
        res.status(500).json({ message: "Error fetching invoice", error: error.message });
    }
};

const getInvoiceByOrder = async (req, res) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { orderId: req.params.order_id },
            include: { customer: true, lines: true }
        });

        if (!invoice) return res.json(null);

        if (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }

        res.json(formatInvoice(invoice));
    } catch (error) {
        res.status(500).json({ message: "Error fetching invoice", error: error.message });
    }
};

const createInvoice = async (req, res) => {
    try {
        const { order_id, lines, due_days = 30, notes } = req.body;

        const order = await prisma.order.findUnique({
            where: { id: order_id }
        });

        if (!order) return res.status(404).json({ message: "Order not found" });

        const existingInvoice = await prisma.invoice.findFirst({
            where: { orderId: order_id },
            include: { customer: true, lines: true }
        });

        if (existingInvoice) return res.json(formatInvoice(existingInvoice));

        let subtotal = 0;
        const invoiceLinesData = [];

        for (const line of lines) {
            subtotal += line.total_price;
            invoiceLinesData.push({
                description: line.description,
                quantity: line.quantity || 1,
                unitPrice: line.unit_price,
                totalPrice: line.total_price
            });
        }

        const taxRate = 18;
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + due_days);

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber: generateInvoiceNumber(),
                orderId: order_id,
                customerId: order.customerId,
                status: 'DRAFT',
                subtotal,
                taxRate,
                taxAmount,
                totalAmount,
                dueDate,
                notes,
                lines: {
                    create: invoiceLinesData
                }
            },
            include: { customer: true, lines: true }
        });

        res.status(201).json(formatInvoice(invoice));
    } catch (error) {
        res.status(400).json({ message: "Error creating invoice", error: error.message });
    }
};

const addPayment = async (req, res) => {
    try {
        const { amount, method, transaction_id } = req.body;
        const invoiceId = req.params.id;

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { customer: true, lines: true }
        });

        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        if (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const paymentMethod = method.toUpperCase();
        let finalTransactionId = transaction_id;

        if (paymentMethod === 'WALLET') {
            const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
            if (!wallet) return res.status(400).json({ message: "Wallet not found" });
            if (wallet.balance < amount) return res.status(400).json({ message: "Insufficient wallet balance" });

            await prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } }
            });

            const balanceBefore = wallet.balance;
            const balanceAfter = balanceBefore - amount;

            const walletTxn = await prisma.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    transactionType: 'DEBIT',
                    amount,
                    balanceBefore,
                    balanceAfter,
                    status: 'COMPLETED',
                    referenceType: 'INVOICE',
                    referenceId: invoice.id,
                    description: `Payment for Invoice #${invoice.invoiceNumber}`
                }
            });

            finalTransactionId = walletTxn.id;
        }

        const payment = await prisma.payment.create({
            data: {
                invoiceId,
                amount,
                method: paymentMethod,
                status: 'COMPLETED',
                transactionId: finalTransactionId
            }
        });

        const newPaidAmount = invoice.paidAmount + amount;
        let newStatus = invoice.status;

        if (newPaidAmount >= invoice.totalAmount) {
            newStatus = 'PAID';
        } else if (newPaidAmount > 0) {
            newStatus = 'PARTIAL';
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoiceId },
            data: { paidAmount: newPaidAmount, status: newStatus }
        });

        if (newStatus === 'PAID') {
            const order = await prisma.order.findUnique({ where: { id: invoice.orderId } });
            if (order && order.status === 'PENDING') {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'CONFIRMED' }
                });
            }
        }

        res.json({
            id: payment.id,
            amount: payment.amount,
            method: payment.method,
            status: payment.status,
            transaction_id: payment.transactionId,
            createdAt: payment.createdAt
        });

    } catch (error) {
        res.status(400).json({ message: "Error adding payment", error: error.message });
    }
};

const getInvoicePayments = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        if (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const payments = await prisma.payment.findMany({
            where: { invoiceId }
        });

        res.json(payments.map(p => ({
            id: p.id,
            amount: p.amount,
            method: p.method,
            status: p.status,
            transaction_id: p.transactionId,
            createdAt: p.createdAt
        })));

    } catch (error) {
        res.status(500).json({ message: "Error fetching payments", error: error.message });
    }
};

module.exports = {
    getInvoices,
    getInvoiceById,
    getInvoiceByOrder,
    createInvoice,
    addPayment,
    getInvoicePayments
};
