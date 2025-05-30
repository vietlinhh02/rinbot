const mongoose = require('mongoose');

const lotteryTicketSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    soDuDoan: { type: String, required: true },
    ngay: { type: String, required: true }, // dd-mm-yyyy
    claimed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// lotteryTicketSchema.index({ userId: 1, ngay: 1 }, { unique: true });

// Nếu vẫn bị lỗi duplicate key, hãy chạy script sau 1 lần để xóa index unique:
// const mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost:27017/rinbot').then(async () => {
//   await mongoose.connection.db.collection('lotterytickets').dropIndex('userId_1_ngay_1');
//   console.log('Đã xóa index userId_1_ngay_1');
//   process.exit(0);
// });

module.exports = mongoose.model('LotteryTicket', lotteryTicketSchema); 