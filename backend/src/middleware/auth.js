const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "No token provided!" });

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, decoded) => {
        if (err) return res.status(401).json({ message: "Unauthorized!" });
        req.user = decoded;
        next();
    });
};

const verifyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Require Admin or proper role Role!" });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    verifyRole
};
