const jwt = require('jsonwebtoken');
const config = require('../config');

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Token missing' });

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ message: 'Token missing' });

    jwt.verify(token, config.secret, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        req.data = decoded;  // student_id, studentname etc.
        next();
    });
}

module.exports = verifyToken;
