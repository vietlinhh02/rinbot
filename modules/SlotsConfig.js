// Slots configuration tương ứng với Python logic
const path = require('path');

class SlotsConfig {
    constructor() {
        // Symbol positions trên reel (0-indexed)
        this.symbolPositions = {
            '🍒': 0,  // Cherry
            '🍊': 1,  // Orange  
            '🍋': 2,  // Lemon
            '🔔': 3,  // Bell
            '⭐': 4,  // Star
            '💎': 5,  // Diamond
            '🎰': 6   // Jackpot
        };

        // Reverse mapping
        this.positionSymbols = {};
        for (const [symbol, pos] of Object.entries(this.symbolPositions)) {
            this.positionSymbols[pos] = symbol;
        }

        // Win multipliers (dựa trên độ hiếm)
        this.multipliers = {
            '🍒': 4,   // Cherry - thường gặp nhất
            '🍊': 80,  // Orange
            '🍋': 40,  // Lemon
            '🔔': 25,  // Bell
            '⭐': 10,  // Star
            '💎': 5,   // Diamond - hiếm nhất
            '🎰': 100  // Jackpot - siêu hiếm
        };

        // Weight cho random (numbers từ Python)
        this.symbolWeights = [3.5, 7, 15, 25, 55]; // Cumulative weights
        this.winRate = 0.12; // 12% cơ hội thắng
        
        // Reel configuration
        this.itemHeight = 180; // Chiều cao mỗi symbol trên reel
        this.itemsPerReel = 7;  // Số symbols unique trên reel (0-6)
        this.reelWidth = 3;     // Số reels
        
        // Animation settings
        this.animationSpeed = 9;   // Tăng tốc độ để ít frames hơn
        this.frameDelay = 100;     // 100ms per frame
        this.totalFrames = Math.floor(this.itemHeight / this.animationSpeed); // 20 frames
    }

    /**
     * Generate random reel positions (không thắng)
     */
    generateRandomPositions() {
        const positions = [];
        for (let i = 0; i < 3; i++) {
            positions.push(Math.floor(Math.random() * this.itemsPerReel));
        }
        
        // Đảm bảo không thắng (không cùng symbol)
        while (positions[0] === positions[1] && positions[1] === positions[2]) {
            positions[2] = Math.floor(Math.random() * this.itemsPerReel);
        }
        
        return positions;
    }

    /**
     * Generate winning positions (theo logic Python)
     */
    generateWinningPositions() {
        // Chọn symbol thắng dựa trên weight (giống Python bisect logic)
        const random = Math.round(Math.random() * 100 * 10) / 10; // Làm tròn 1 chữ số thập phân
        let symbolIndex = 0;
        
        // Tìm symbol theo cumulative weights
        for (let i = 0; i < this.symbolWeights.length; i++) {
            if (random <= this.symbolWeights[i]) {
                symbolIndex = i;
                break;
            }
        }
        
        // Thêm random offset giống Python (pos + random * items/6)
        const itemsPerGroup = Math.floor(this.itemsPerReel / 6);
        const randomOffset = Math.floor(Math.random() * itemsPerGroup) * 6;
        symbolIndex = symbolIndex + randomOffset;
        
        // Đảm bảo không vượt quá range và không hit symbol cuối
        if (symbolIndex >= this.itemsPerReel) {
            symbolIndex = symbolIndex - 6;
        }
        
        // Tất cả 3 reels cùng symbol
        return [symbolIndex, symbolIndex, symbolIndex];
    }

    /**
     * Convert positions to symbols
     */
    positionsToSymbols(positions) {
        return positions.map(pos => this.positionSymbols[pos] || '🍒');
    }

    /**
     * Calculate win amount
     */
    calculateWin(symbols, bet) {
        const symbol = symbols[0];
        if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
            return (this.multipliers[symbol] || 0) * bet;
        }
        return 0;
    }

    /**
     * Tạo animation frames cho slots
     */
    createAnimationFrames(finalPositions) {
        const frames = [];
        
        // Tạo random offsets cho mỗi reel (giống Python)
        const reelOffsets = [];
        for (let reelIndex = 0; reelIndex < 3; reelIndex++) {
            reelOffsets.push(Math.floor(Math.random() * (this.itemsPerReel - 1)) + 1);
        }
        
        for (let i = 1; i <= this.totalFrames; i++) {
            const framePositions = [];
            
            for (let reelIndex = 0; reelIndex < 3; reelIndex++) {
                // Logic từ Python: position + offset * 6 - (speed * i)
                const finalPos = finalPositions[reelIndex];
                const offset = reelOffsets[reelIndex];
                
                let currentPos = finalPos + (offset * 6) - (this.animationSpeed * i);
                
                // Wrap around nếu âm
                while (currentPos < 0) {
                    currentPos += this.itemsPerReel;
                }
                
                // Modulo để đảm bảo trong range
                currentPos = currentPos % this.itemsPerReel;
                
                framePositions.push(Math.floor(currentPos));
            }
            
            frames.push(this.positionsToSymbols(framePositions));
        }
        
        // Đảm bảo frame cuối là kết quả đúng
        frames[frames.length - 1] = this.positionsToSymbols(finalPositions);
        
        return frames;
    }

    /**
     * Get asset paths
     */
    getAssetPaths() {
        const modulesPath = path.join(__dirname);
        return {
            facePath: path.join(modulesPath, 'slot-face.png'),
            reelPath: path.join(modulesPath, 'slot-reel.png'),
            tablePath: path.join(modulesPath, 'table.png')
        };
    }
}

module.exports = new SlotsConfig(); 