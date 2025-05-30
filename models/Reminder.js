const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    reminderTime: {
        type: Date,
        required: true
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index để tìm kiếm nhanh
reminderSchema.index({ userId: 1, isCompleted: 1 });
reminderSchema.index({ reminderTime: 1, isCompleted: 1 });

module.exports = mongoose.model('Reminder', reminderSchema); 