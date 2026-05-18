const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMe } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateMe);

module.exports = router;
