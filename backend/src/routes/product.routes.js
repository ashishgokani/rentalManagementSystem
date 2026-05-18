const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, verifyRole } = require('../middleware/auth');
const {
    getCategories, createCategory, updateCategory, deleteCategory,
    uploadImage,
    getProducts, getProductById, createProduct, updateProduct, deleteProduct
} = require('../controllers/product.controller');

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Invalid file type'));
    }
});

// Category routes (public read, auth for write)
router.get('/categories', getCategories);
router.post('/categories', verifyToken, verifyRole(['VENDOR', 'ADMIN']), createCategory);
router.put('/categories/:id', verifyToken, verifyRole(['ADMIN']), updateCategory);
router.delete('/categories/:id', verifyToken, verifyRole(['ADMIN']), deleteCategory);

// Image upload
router.post('/upload-image', verifyToken, verifyRole(['VENDOR', 'ADMIN']), upload.single('file'), uploadImage);

// Product routes
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', verifyToken, verifyRole(['VENDOR', 'ADMIN']), createProduct);
router.put('/:id', verifyToken, verifyRole(['VENDOR', 'ADMIN']), updateProduct);
router.delete('/:id', verifyToken, verifyRole(['VENDOR', 'ADMIN']), deleteProduct);

module.exports = router;
