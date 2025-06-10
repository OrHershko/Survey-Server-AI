const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    // Basic email validation
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
  },
  passwordHash: {
    type: String,
    required: true,
  },
  refreshTokens: [{
    token: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Method to hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to add refresh token
userSchema.methods.addRefreshToken = function (token) {
  const expiryDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN?.replace('d', '')) || 7;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  
  this.refreshTokens.push({ token, expiresAt });
  
  // Clean up expired tokens
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > new Date());
  
  return this.save();
};

// Method to remove refresh token
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

// Method to validate refresh token
userSchema.methods.isValidRefreshToken = function (token) {
  const refreshToken = this.refreshTokens.find(rt => rt.token === token);
  return refreshToken && refreshToken.expiresAt > new Date();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 