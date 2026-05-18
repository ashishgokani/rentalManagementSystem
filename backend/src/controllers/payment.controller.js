const prisma = require('../config/prisma');

const createPaymentOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        
        const invoice = await prisma.invoice.findFirst({
            where: { orderId }
        });

        if (!invoice) return res.status(404).json({ message: "Invoice not found for this order" });

        // Mock Razorpay order creation
        const paymentOrder = {
            id: `pay_${Date.now()}`,
            amount: invoice.totalAmount * 100, // in paise
            currency: "INR"
        };

        res.json(paymentOrder);
    } catch (error) {
        res.status(500).json({ message: "Error creating payment", error: error.message });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { orderId, paymentId, signature } = req.body;

        // Mock verification logic
        if (paymentId && signature) {
            await prisma.invoice.updateMany({
                where: { orderId },
                data: { status: 'PAID' }
            });

            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'ACTIVE' }
            });

            return res.json({ message: "Payment verified successfully" });
        }

        res.status(400).json({ message: "Payment verification failed" });
    } catch (error) {
        res.status(500).json({ message: "Error verifying payment", error: error.message });
    }
};

module.exports = {
    createPaymentOrder,
    verifyPayment
};
