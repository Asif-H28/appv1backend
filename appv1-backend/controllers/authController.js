const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password BEFORE saving
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user with hashed password
    const user = new User({ 
      name, 
      email, 
      password: hashedPassword 
    });
    
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { 
      expiresIn: '7d' 
    });

    res.json({
      token,
      user: { id: user._id, name: user.name, email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
