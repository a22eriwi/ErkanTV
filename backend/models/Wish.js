const mongoose = require('mongoose');

const WishSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: String,
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Wish', WishSchema);