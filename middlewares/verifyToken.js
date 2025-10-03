const jwt = require('jsonwebtoken');
const config = require('../config');
const utils = require('../utils');

function verifyToken(req, res, next) {
  const token = req.headers['token'];
  if (!token) return res.status(401).send(utils.createError('missing token'));

  try {
    const decoded = jwt.verify(token, config.secret);
     console.log(" Decoded JWT:", decoded); 
    req.data = decoded; // attach JWT payload
    next();
  } catch (err) {
    return res.status(401).send(utils.createError('invalid token'));
  }
}

module.exports = verifyToken;
