const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

const generateToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: '24h'
    });
};

const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, companyName, businessCategory, gstin, address, city, state, postalCode, phone } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                passwordHash,
                role: role || 'CUSTOMER',
                companyName,
                businessCategory,
                gstin,
                address,
                city,
                state,
                postalCode
            }
        });

        // Create a wallet for the user
        await prisma.wallet.create({ data: { userId: user.id } });

        const token = generateToken(user);

        res.status(201).json({
            token,
            refreshToken: token, // For now same token; can implement refresh logic later
            tokenType: 'bearer',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                companyName: user.companyName,
                businessCategory: user.businessCategory,
                gstin: user.gstin,
                phone: user.phone,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated. Contact support.' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user);

        res.status(200).json({
            token,
            refreshToken: token,
            tokenType: 'bearer',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                companyName: user.companyName,
                businessCategory: user.businessCategory,
                gstin: user.gstin,
                phone: user.phone,
                address: user.address,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            phone: user.phone,
            address: user.address,
            city: user.city,
            state: user.state,
            postalCode: user.postalCode,
            country: user.country,
            companyName: user.companyName,
            businessCategory: user.businessCategory,
            gstin: user.gstin,
            isActive: user.isActive,
            referralCode: user.referralCode,
            profilePhoto: user.profilePhoto
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
};

const updateMe = async (req, res) => {
    try {
        const { firstName, lastName, phone, companyName, businessCategory, gstin, address, city, state, postalCode, country } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { firstName, lastName, phone, companyName, businessCategory, gstin, address, city, state, postalCode, country }
        });
        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

module.exports = { register, login, getMe, updateMe };
