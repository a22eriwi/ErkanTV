const mongoose = require('mongoose');

const WatchProgressSchema = new mongoose.Schema({
    userEmail: String,
    fileName: String,
    fullPath: String, // required for series resume
    time: Number,     // time watched in seconds
    duration: Number, // total video duration in seconds
    type: String,
}, { timestamps: true });

module.exports = mongoose.model('WatchProgress', WatchProgressSchema);