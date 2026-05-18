require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins dynamically to prevent preflight errors across localhost, 127.0.0.1, and other network hosts
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const orderRoutes = require('./src/routes/order.routes');
const quotationRoutes = require('./src/routes/quotation.routes');
const invoiceRoutes = require('./src/routes/invoice.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const walletRoutes = require('./src/routes/wallet.routes');
const adminRoutes = require('./src/routes/admin.routes');
const paymentRoutes = require('./src/routes/payment.routes');

// Basic health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Rental Management System API is running (Node.js/Express/Prisma)' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
