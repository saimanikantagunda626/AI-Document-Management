const jwt = require('jsonwebtoken')

module.exports = function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Authentication required'
    })
  }

  const token = authorization.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = { userId: decoded.userId }
    next()
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token'
    })
  }
}