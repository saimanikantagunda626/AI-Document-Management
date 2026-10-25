const User = require('../models/user')
const jwt = require('jsonwebtoken')

function createToken(userId) {
  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  )
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required'
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters'
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = await User.findOne({ email: normalizedEmail })

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      })
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password
    })

    return res.status(201).json({
      message: 'Registration successful',
      token: createToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      })
    }

    console.error('Registration error:', error.message)
    return res.status(500).json({
      message: 'Registration failed'
    })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      })
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    })

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    return res.json({
      message: 'Login successful',
      token: createToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Login error:', error.message)
    return res.status(500).json({
      message: 'Login failed'
    })
  }
}

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      '-password'
    )

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.json({ user })
  } catch (error) {
    return res.status(500).json({
      message: 'Could not retrieve user'
    })
  }
}