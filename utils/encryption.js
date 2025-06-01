const crypto = require('crypto');

// Khóa mã hóa - nên được lưu trong .env trong thực tế
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'rinbot-secret-key-32-characters!'; // 32 chars
const ALGORITHM = 'aes-256-cbc';

// Đảm bảo key có đúng 32 bytes cho AES-256
const KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

/**
 * Mã hóa API key
 * @param {string} text - API key cần mã hóa
 * @returns {string} - API key đã được mã hóa
 */
function encryptApiKey(text) {
    try {
        const iv = crypto.randomBytes(16); // Vector khởi tạo ngẫu nhiên
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Kết hợp iv + encrypted data
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Không thể mã hóa API key');
    }
}

/**
 * Giải mã API key
 * @param {string} encryptedText - API key đã được mã hóa
 * @returns {string} - API key gốc
 */
function decryptApiKey(encryptedText) {
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = parts[1];
        
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Không thể giải mã API key');
    }
}

/**
 * Tạo hash từ API key để kiểm tra mà không cần giải mã
 * @param {string} apiKey - API key gốc
 * @returns {string} - Hash của API key
 */
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
}

module.exports = {
    encryptApiKey,
    decryptApiKey,
    hashApiKey
}; 