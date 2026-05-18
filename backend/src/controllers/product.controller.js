const prisma = require('../config/prisma');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// =====================
// Categories
// =====================

const getCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            include: { _count: { select: { products: true } } },
            orderBy: { name: 'asc' }
        });

        const result = categories.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            isActive: c.isActive,
            productCount: c._count.products,
            createdAt: c.createdAt
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required' });

        const existing = await prisma.category.findFirst({ where: { name } });
        if (existing) return res.status(400).json({ message: 'Category already exists' });

        const category = await prisma.category.create({
            data: { name, description }
        });

        res.status(201).json({ ...category, productCount: 0 });
    } catch (error) {
        res.status(400).json({ message: 'Error creating category', error: error.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        const category = await prisma.category.update({
            where: { id },
            data: { name, description, isActive }
        });
        res.json(category);
    } catch (error) {
        res.status(400).json({ message: 'Error updating category', error: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        await prisma.category.delete({ where: { id: req.params.id } });
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting category', error: error.message });
    }
};

// =====================
// Image Upload
// =====================

const uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ url: imageUrl, filename: req.file.filename });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
};

// =====================
// Products
// =====================

const formatProduct = (product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    images: product.images || [],
    category: product.category?.name || null,
    categoryId: product.categoryId,
    isRentable: product.isRentable,
    rentalPricing: {
        hourly: product.rentalPriceHourly,
        daily: product.rentalPriceDaily,
        weekly: product.rentalPriceWeekly
    },
    costPrice: product.costPrice || 0,
    salesPrice: product.salesPrice || 0,
    quantityOnHand: product.quantityOnHand || 0,
    reservedQuantity: product.reservedQuantity || 0,
    availableQuantity: (product.quantityOnHand || 0) - (product.reservedQuantity || 0),
    isPublished: product.isPublished,
    vendorId: product.vendorId,
    vendorName: product.vendor ? `${product.vendor.firstName} ${product.vendor.lastName}` : '',
    attributes: product.attributes || [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
});

const getProducts = async (req, res) => {
    try {
        const { search, category, isPublished, vendorId, sortBy, skip = 0, limit = 50 } = req.query;

        let whereClause = {};

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (category) {
            const cat = await prisma.category.findFirst({ where: { name: category } });
            if (cat) whereClause.categoryId = cat.id;
        }

        if (isPublished !== undefined) {
            whereClause.isPublished = isPublished === 'true';
        }

        if (vendorId) whereClause.vendorId = vendorId;

        let orderBy = { createdAt: 'desc' };
        if (sortBy === 'price_asc') orderBy = { rentalPriceDaily: 'asc' };
        else if (sortBy === 'price_desc') orderBy = { rentalPriceDaily: 'desc' };

        const products = await prisma.product.findMany({
            where: whereClause,
            include: { vendor: true, category: true },
            orderBy,
            skip: parseInt(skip),
            take: parseInt(limit)
        });

        res.json(products.map(formatProduct));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { vendor: true, category: true }
        });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(formatProduct(product));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
};

const createProduct = async (req, res) => {
    try {
        const {
            name, description, images, categoryId, isRentable, rentalPricing,
            costPrice, salesPrice, quantityOnHand, isPublished, attributes
        } = req.body;

        const product = await prisma.product.create({
            data: {
                name,
                description,
                images: images || [],
                categoryId: categoryId || null,
                isRentable: isRentable !== undefined ? isRentable : true,
                rentalPriceHourly: rentalPricing?.hourly || null,
                rentalPriceDaily: rentalPricing?.daily || null,
                rentalPriceWeekly: rentalPricing?.weekly || null,
                costPrice: costPrice || 0,
                salesPrice: salesPrice || 0,
                quantityOnHand: quantityOnHand || 0,
                isPublished: isPublished || false,
                attributes: attributes || [],
                vendorId: req.user.id
            },
            include: { vendor: true, category: true }
        });

        res.status(201).json(formatProduct(product));
    } catch (error) {
        console.error('Create product error:', error);
        res.status(400).json({ message: 'Error creating product', error: error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'Product not found' });

        if (req.user.role !== 'ADMIN' && existing.vendorId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this product' });
        }

        const {
            name, description, images, categoryId, isRentable, rentalPricing,
            costPrice, salesPrice, quantityOnHand, isPublished, attributes
        } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (images !== undefined) updateData.images = images;
        if (categoryId !== undefined) updateData.categoryId = categoryId || null;
        if (isRentable !== undefined) updateData.isRentable = isRentable;
        if (rentalPricing !== undefined) {
            updateData.rentalPriceHourly = rentalPricing.hourly;
            updateData.rentalPriceDaily = rentalPricing.daily;
            updateData.rentalPriceWeekly = rentalPricing.weekly;
        }
        if (costPrice !== undefined) updateData.costPrice = costPrice;
        if (salesPrice !== undefined) updateData.salesPrice = salesPrice;
        if (quantityOnHand !== undefined) updateData.quantityOnHand = quantityOnHand;
        if (isPublished !== undefined) updateData.isPublished = isPublished;
        if (attributes !== undefined) updateData.attributes = attributes;

        const product = await prisma.product.update({
            where: { id },
            data: updateData,
            include: { vendor: true, category: true }
        });

        res.json(formatProduct(product));
    } catch (error) {
        res.status(400).json({ message: 'Error updating product', error: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'Product not found' });

        if (req.user.role !== 'ADMIN' && existing.vendorId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this product' });
        }

        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting product', error: error.message });
    }
};

module.exports = {
    getCategories, createCategory, updateCategory, deleteCategory,
    uploadImage,
    getProducts, getProductById, createProduct, updateProduct, deleteProduct
};
