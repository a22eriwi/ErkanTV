const mongoose = require('mongoose');

const StreamLogSchema = new mongoose.Schema({
  userEmail: String,
  userName: String,
  fileName: String,
  seriesName: String,
  type: String,
  createdAt: {
    type: Date,
    default: Date.now, // ✅ This ensures timestamps are stored properly
  },
});

module.exports = mongoose.model('StreamLog', StreamLogSchema);