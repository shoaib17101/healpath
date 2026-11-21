const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('-password');

    if (!user) {
      return res.status(401).json({ msg: 'Token is not valid' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ msg: 'Your account has been suspended. Please contact an administrator.' });
    }

    if (user.status !== 'approved') {
      if (user.status === 'pending') {
        return res.status(403).json({ msg: 'Account is pending approval. Please wait for an administrator to approve your account.' });
      }
      return res.status(403).json({ msg: 'Account is not approved.' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
