const prisma = require('../config/prisma');

const formatQuotation = (quotation) => ({
    id: quotation.id,
    quotation_number: quotation.id.substring(0, 8).toUpperCase(),
    customerId: quotation.customerId,
    customer_name: quotation.customer ? `${quotation.customer.firstName} ${quotation.customer.lastName}` : '',
    status: quotation.status,
    subtotal: quotation.subtotal,
    tax_rate: quotation.taxRate,
    taxAmount: quotation.taxAmount,
    totalAmount: quotation.totalAmount,
    notes: quotation.notes,
    valid_until: quotation.validUntil,
    createdAt: quotation.createdAt,
    updatedAt: quotation.updatedAt,
    lines: (quotation.items || []).map(line => ({
        id: line.id,
        productId: line.productId,
        product_name: line.productName || line.product?.name || '',
        quantity: line.quantity,
        rental_period_type: line.rentalPeriodType,
        rental_start_date: line.startDate,
        rental_end_date: line.endDate,
        unitPrice: line.unitPrice,
        total_price: line.totalPrice
    }))
});

const getQuotations = async (req, res) => {
    try {
        const { status, limit = 50, skip = 0 } = req.query;
        let whereClause = {};

        if (req.user.role === 'CUSTOMER') {
            whereClause.customerId = req.user.id;
        } else if (req.user.role === 'VENDOR') {
            whereClause.items = { some: { product: { vendorId: req.user.id } } };
        }

        if (status) {
            whereClause.status = status.toUpperCase();
        }

        const quotations = await prisma.quotation.findMany({
            where: whereClause,
            include: { customer: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(skip)
        });

        res.json(quotations.map(formatQuotation));
    } catch (error) {
        res.status(500).json({ message: "Error fetching quotations", error: error.message });
    }
};

const getQuotationById = async (req, res) => {
    try {
        const quotation = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: { customer: true, items: { include: { product: true } } }
        });

        if (!quotation) return res.status(404).json({ message: "Quotation not found" });

        if (req.user.role === 'CUSTOMER' && quotation.customerId !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (req.user.role === 'VENDOR') {
            const hasVendorProduct = quotation.items.some(item => item.product?.vendorId === req.user.id);
            if (!hasVendorProduct) return res.status(403).json({ message: "Unauthorized" });
        }

        res.json(formatQuotation(quotation));
    } catch (error) {
        res.status(500).json({ message: "Error fetching quotation", error: error.message });
    }
};

const createQuotation = async (req, res) => {
    try {
        const { lines, valid_days = 7, notes } = req.body;
        const customerId = req.user.id;

        // items: [{ product_id, quantity, rental_period, unit_price, total_price }]
        const quotationItemsData = [];
        let subtotal = 0;

        for (const line of lines) {
            const product = await prisma.product.findUnique({ where: { id: line.product_id } });
            if (!product) continue;

            const start = new Date(line.rental_period.start_date);
            const end = new Date(line.rental_period.end_date);
            
            subtotal += line.total_price;

            quotationItemsData.push({
                productId: product.id,
                productName: product.name,
                quantity: parseInt(line.quantity),
                rentalPeriodType: line.rental_period.type,
                startDate: start,
                endDate: end,
                unitPrice: line.unit_price,
                totalPrice: line.total_price
            });
        }

        const taxRate = 18;
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;
        
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + valid_days);

        const quotation = await prisma.quotation.create({
            data: {
                customerId,
                status: 'DRAFT',
                subtotal,
                taxRate,
                taxAmount,
                totalAmount,
                notes,
                validUntil,
                items: {
                    create: quotationItemsData
                }
            },
            include: { customer: true, items: { include: { product: true } } }
        });

        res.status(201).json([formatQuotation(quotation)]);
    } catch (error) {
        res.status(400).json({ message: "Error creating quotation", error: error.message });
    }
};

const updateQuotation = async (req, res) => {
    try {
        const { status, notes, lines } = req.body;
        const quotationId = req.params.id;

        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            include: { items: true }
        });

        if (!quotation) return res.status(404).json({ message: "Quotation not found" });

        if (req.user.role === 'CUSTOMER' && quotation.customerId !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        let updateData = {};
        
        if (status) {
            updateData.status = status.toUpperCase();
        }
        
        if (notes !== undefined) {
            updateData.notes = notes;
        }

        if (lines && (req.user.role === 'VENDOR' || req.user.role === 'ADMIN')) {
            let subtotal = 0;
            for (const lineUpdate of lines) {
                await prisma.quotationLine.update({
                    where: { id: lineUpdate.id },
                    data: {
                        unitPrice: lineUpdate.unit_price,
                        totalPrice: lineUpdate.total_price
                    }
                });
            }
            
            const updatedLines = await prisma.quotationLine.findMany({ where: { quotationId } });
            subtotal = updatedLines.reduce((sum, line) => sum + line.totalPrice, 0);
            
            updateData.subtotal = subtotal;
            updateData.taxAmount = subtotal * (quotation.taxRate / 100);
            updateData.totalAmount = subtotal + updateData.taxAmount;
        }

        const updatedQuotation = await prisma.quotation.update({
            where: { id: quotationId },
            data: updateData,
            include: { customer: true, items: { include: { product: true } } }
        });

        res.json(formatQuotation(updatedQuotation));
    } catch (error) {
        res.status(400).json({ message: "Error updating quotation", error: error.message });
    }
};

const deleteQuotation = async (req, res) => {
    try {
        const quotationId = req.params.id;
        const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });

        if (!quotation) return res.status(404).json({ message: "Quotation not found" });

        if (req.user.role === 'CUSTOMER' && quotation.customerId !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (quotation.status === 'CONFIRMED') {
            return res.status(400).json({ message: "Cannot delete confirmed quotation" });
        }

        await prisma.quotation.update({
            where: { id: quotationId },
            data: { status: 'CANCELLED' }
        });

        res.json({ message: "Quotation cancelled successfully" });
    } catch (error) {
        res.status(400).json({ message: "Error deleting quotation", error: error.message });
    }
};

module.exports = {
    createQuotation,
    getQuotations,
    getQuotationById,
    updateQuotation,
    deleteQuotation
};
