const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const walletService = require('./wallet.service');

const REFERRAL_BONUS_NEW_USER = 500.0;
const REFERRAL_BONUS_REFERRER = 250.0;

// In-memory OTP storage
const otpStorage = new Map();

const generateReferralCode = () => {
    return 'REF-' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

const createAccessToken = (user) => {
    const secret = process.env.JWT_SECRET || 'your-default-jwt-secret-key-change-it';
    const expires = process.env.JWT_EXPIRES_IN || '24h';
    return jwt.sign({ sub: user.id, email: user.email, role: user.role, type: 'access' }, secret, { expiresIn: expires });
};

const createRefreshToken = (user) => {
    const secret = process.env.JWT_SECRET || 'your-default-jwt-secret-key-change-it';
    return jwt.sign({ sub: user.id, type: 'refresh' }, secret, { expiresIn: '7d' });
};

const verifyToken = (token, type = 'access') => {
    try {
        const secret = process.env.JWT_SECRET || 'your-default-jwt-secret-key-change-it';
        const payload = jwt.verify(token, secret);
        if (payload.type !== type) return null;
        return payload;
    } catch (e) {
        return null;
    }
};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOtp = (email) => {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    otpStorage.set(email, { otp, expiresAt });
    return otp;
};

const verifyOtp = (email, otp, consume = true) => {
    if (!otpStorage.has(email)) return false;
    const record = otpStorage.get(email);
    if (new Date() > record.expiresAt) {
        otpStorage.delete(email);
        return false;
    }
    if (record.otp !== otp) return false;
    if (consume) {
        otpStorage.delete(email);
    }
    return true;
};

const getUserByEmail = async (email) => {
    return await prisma.user.findUnique({ where: { email } });
};

const getUserById = async (id) => {
    return await prisma.user.findUnique({ where: { id } });
};

const getUserByReferralCode = async (code) => {
    return await prisma.user.findUnique({ where: { referralCode: code } });
};

const createUser = async (userData) => {
    const passwordHash = await hashPassword(userData.password);
    
    // Generate unique referral code
    let refCode = generateReferralCode();
    while (await getUserByReferralCode(refCode)) {
        refCode = generateReferralCode();
    }

    // Check referral
    let referrer = null;
    if (userData.referral_code) {
        referrer = await getUserByReferralCode(userData.referral_code);
        if (referrer && referrer.referralUsed) {
            referrer = null;
        }
    }

    const createdUser = await prisma.user.create({
        data: {
            firstName: userData.first_name,
            lastName: userData.last_name,
            email: userData.email,
            phone: userData.phone || '',
            passwordHash,
            role: userData.role || 'CUSTOMER',
            companyName: userData.company_name,
            businessCategory: userData.business_category,
            gstin: userData.gstin,
            isActive: true,
            referralCode: refCode,
            referredBy: referrer ? referrer.id : null
        }
    });

    // Handle wallet & referral bonuses
    if (referrer) {
        await prisma.user.update({
            where: { id: referrer.id },
            data: { referralUsed: true }
        });

        // Create wallet with initial bonus
        await walletService.creditWallet(createdUser.id, REFERRAL_BONUS_NEW_USER, 'Referral signup bonus');
        
        // Reward referrer
        await walletService.creditWallet(referrer.id, REFERRAL_BONUS_REFERRER, 'Referral bonus - new user signed up');
    } else {
        // Just initialize empty wallet
        await walletService.getOrCreateWallet(createdUser.id);
    }

    return createdUser;
};

const authenticateUser = async (email, password) => {
    const user = await getUserByEmail(email);
    if (!user) return null;
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) return null;
    return user;
};

module.exports = {
    hashPassword,
    verifyPassword,
    createAccessToken,
    createRefreshToken,
    verifyToken,
    generateOtp,
    storeOtp,
    verifyOtp,
    getUserByEmail,
    getUserById,
    getUserByReferralCode,
    createUser,
    authenticateUser
};
