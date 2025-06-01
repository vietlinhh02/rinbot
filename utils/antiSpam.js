// Hệ thống chống spam và rate limiting
const userCooldowns = new Map(); // userId -> Map<commandName -> lastUsed>
const userLocks = new Map(); // userId -> Set<commandName> (commands đang xử lý)

class AntiSpamManager {
    
    /**
     * Kiểm tra và đặt lock cho command để tránh race condition
     * @param {string} userId - ID người dùng
     * @param {string} commandName - Tên command
     * @returns {boolean} - true nếu có thể thực hiện, false nếu đang bị lock
     */
    static acquireLock(userId, commandName) {
        if (!userLocks.has(userId)) {
            userLocks.set(userId, new Set());
        }
        
        const userCommandLocks = userLocks.get(userId);
        
        // Kiểm tra xem command đã bị lock chưa
        if (userCommandLocks.has(commandName)) {
            return false; // Đang bị lock
        }
        
        // Đặt lock
        userCommandLocks.add(commandName);
        return true;
    }
    
    /**
     * Giải phóng lock cho command
     * @param {string} userId - ID người dùng  
     * @param {string} commandName - Tên command
     */
    static releaseLock(userId, commandName) {
        if (userLocks.has(userId)) {
            userLocks.get(userId).delete(commandName);
            
            // Cleanup nếu không còn lock nào
            if (userLocks.get(userId).size === 0) {
                userLocks.delete(userId);
            }
        }
    }
    
    /**
     * Kiểm tra cooldown của command
     * @param {string} userId - ID người dùng
     * @param {string} commandName - Tên command  
     * @param {number} cooldownMs - Thời gian cooldown (ms)
     * @returns {Object} - {canUse: boolean, timeLeft: number}
     */
    static checkCooldown(userId, commandName, cooldownMs) {
        if (!userCooldowns.has(userId)) {
            userCooldowns.set(userId, new Map());
        }
        
        const userCommands = userCooldowns.get(userId);
        const now = Date.now();
        const lastUsed = userCommands.get(commandName) || 0;
        const timeLeft = (lastUsed + cooldownMs) - now;
        
        if (timeLeft > 0) {
            return {
                canUse: false,
                timeLeft: Math.ceil(timeLeft / 1000) // Convert to seconds
            };
        }
        
        return { canUse: true, timeLeft: 0 };
    }
    
    /**
     * Đặt cooldown cho command
     * @param {string} userId - ID người dùng
     * @param {string} commandName - Tên command
     */
    static setCooldown(userId, commandName) {
        if (!userCooldowns.has(userId)) {
            userCooldowns.set(userId, new Map());
        }
        
        userCooldowns.get(userId).set(commandName, Date.now());
    }
    
    /**
     * Fast wrapper - Kiểm tra nhanh và thực thi
     * @param {string} userId - ID người dùng
     * @param {string} commandName - Tên command
     * @param {number} cooldownSeconds - Cooldown tính bằng giây
     * @param {Function} commandFunction - Function cần được bảo vệ
     * @param {*} thisContext - Context của command (this)
     * @param {...any} args - Arguments cho command function
     * @returns {Promise<any>} - Kết quả của command function
     */
    static async executeWithProtection(userId, commandName, cooldownSeconds, commandFunction, thisContext, ...args) {
        // Fast path - skip checks for very short cooldowns
        if (cooldownSeconds <= 1) {
            return await commandFunction.apply(thisContext, args);
        }
        
        const cooldownMs = cooldownSeconds * 1000;
        const lockKey = `${userId}_${commandName}`;
        
        // Combined check - faster than separate calls
        const now = Date.now();
        const userCommands = userCooldowns.get(userId);
        const lastUsed = userCommands?.get(commandName) || 0;
        const timeLeft = (lastUsed + cooldownMs) - now;
        
        if (timeLeft > 0) {
            throw new Error(`⏰ Còn **${Math.ceil(timeLeft / 1000)}s** nữa!`);
        }
        
        // Quick lock check
        const userLockSet = userLocks.get(userId);
        if (userLockSet?.has(commandName)) {
            throw new Error(`🔒 Đang xử lý...`);
        }
        
        // Set everything at once
        if (!userCooldowns.has(userId)) userCooldowns.set(userId, new Map());
        if (!userLocks.has(userId)) userLocks.set(userId, new Set());
        
        userCooldowns.get(userId).set(commandName, now);
        userLocks.get(userId).add(commandName);
        
        try {
            return await commandFunction.apply(thisContext, args);
        } finally {
            userLocks.get(userId)?.delete(commandName);
        }
    }
    
    /**
     * Middleware cho các command có nhiều lần sử dụng per day
     * @param {string} userId - ID người dùng
     * @param {string} commandName - Tên command
     * @param {number} maxUsesPerDay - Số lần tối đa mỗi ngày
     * @returns {Object} - {canUse: boolean, usesLeft: number, resetTime: string}
     */
    static checkDailyLimit(userId, commandName, maxUsesPerDay) {
        const today = new Date().toDateString();
        const dailyKey = `${commandName}_${today}`;
        
        if (!userCooldowns.has(userId)) {
            userCooldowns.set(userId, new Map());
        }
        
        const userCommands = userCooldowns.get(userId);
        const usesToday = userCommands.get(dailyKey) || 0;
        
        if (usesToday >= maxUsesPerDay) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            return {
                canUse: false,
                usesLeft: 0,
                resetTime: tomorrow.toLocaleString('vi-VN')
            };
        }
        
        return {
            canUse: true,
            usesLeft: maxUsesPerDay - usesToday,
            resetTime: null
        };
    }
    
    /**
     * Tăng số lần sử dụng daily
     * @param {string} userId - ID người dùng
     * @param {string} commandName - Tên command
     */
    static incrementDailyUse(userId, commandName) {
        const today = new Date().toDateString();
        const dailyKey = `${commandName}_${today}`;
        
        if (!userCooldowns.has(userId)) {
            userCooldowns.set(userId, new Map());
        }
        
        const userCommands = userCooldowns.get(userId);
        const currentUses = userCommands.get(dailyKey) || 0;
        userCommands.set(dailyKey, currentUses + 1);
    }
    
    /**
     * Cleanup dữ liệu cũ để tránh memory leak
     */
    static cleanup() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        for (const [userId, userCommands] of userCooldowns.entries()) {
            for (const [commandKey, lastUsed] of userCommands.entries()) {
                // Xóa entries cũ hơn 1 ngày
                if (now - lastUsed > oneDay) {
                    userCommands.delete(commandKey);
                }
            }
            
            // Xóa user nếu không còn command nào
            if (userCommands.size === 0) {
                userCooldowns.delete(userId);
            }
        }
        
        console.log('✅ AntiSpam cleanup completed');
    }
}

// Cleanup mỗi giờ
setInterval(() => {
    AntiSpamManager.cleanup();
}, 60 * 60 * 1000);

module.exports = AntiSpamManager; 