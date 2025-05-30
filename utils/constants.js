// Pet constants
const PET_TYPES = {
    "Mèo Anh Lông Ngắn": "🐱",
    "Chó InuShiba": "🐶",
    "Chó Husky": "🐺",
    "Mèo Anh Lông Dài": "🐱",
    "Thỏ Ngọc": "🐰",
    "Cá Mập": "🦈",
    "Chim Cu": "🐦",
    "Kong": "🦍",
    "Godzilla": "🦖"
};

const PET_IMAGES = {
    "Mèo Anh Lông Ngắn": "https://i.pinimg.com/736x/49/ca/70/49ca70a130b8e4117bb3d8101b6adea2.jpg",
    "Chó InuShiba": "https://i.pinimg.com/736x/d9/bf/80/d9bf80fba9d6a04cc446419212bc8fe8.jpg",
    "Chó Husky": "https://i.pinimg.com/736x/24/89/a5/2489a50153933d4abaefb7c1e663bde0.jpg",
    "Mèo Anh Lông Dài": "https://i.pinimg.com/736x/47/44/3b/47443b329edf9fc03ea5df07819e8290.jpg",
    "Thỏ Ngọc": "https://i.pinimg.com/736x/82/77/17/827717d62f0d157dfcc774d19f656b40.jpg",
    "Cá Mập": "https://i.pinimg.com/736x/50/1e/f4/501ef429d5a122bb6e2ba7d83c21d4e7.jpg",
    "Chim Cu": "https://i.pinimg.com/736x/a8/b5/c5/a8b5c5ac2940e7991ebcdd20a9142a95.jpg",
    "Kong": "https://i.pinimg.com/736x/f3/7b/39/f37b3928226e840d1ab45ac72f971b4a.jpg",
    "Godzilla": "https://i.pinimg.com/736x/b2/80/64/b280647191ef5c99116f50e64d30ead8.jpg"
};

// Tree constants
const TREE_VALUES = {
    'Cây chuối': 100,
    'Cây dưa hấu': 100,
    'Cây xoài': 150,
    'Cây thơm': 200,
    'Cây cam': 200,
    'Cây dâu tây': 250,
    'Cây dừa': 250,
    'Cỏ thúi địch': 80
};

const TREE_IMAGES = {
    'Cây chuối': "https://i.pinimg.com/originals/cb/49/c1/cb49c1b04b89389ed3be37bc9032379a.gif",
    'Cây dưa hấu': "https://i.pinimg.com/originals/36/4a/bc/364abcf7466b3e725a4de1b3738940b3.gif",
    'Cây xoài': "https://i.pinimg.com/originals/8e/cb/5b/8ecb5bda69e29eb348a04ad66077fac6.gif",
    'Cây thơm': "https://i.pinimg.com/originals/58/b5/d4/58b5d422751a8588cca6ae570f027166.gif",
    'Cây cam': "https://i.pinimg.com/originals/62/56/12/6256125d41924b5514146ae1807ed7eb.gif",
    'Cây dâu tây': "https://i.pinimg.com/originals/98/0f/b3/980fb3322661b41066078ea0774ed900.gif",
    'Cây dừa': "https://i.pinimg.com/originals/59/32/64/593264f65c7cf211d5f633c0fe6cf356.gif",
    'Cỏ thúi địch': "https://i.pinimg.com/originals/9b/d8/1b/9bd81b44964934c34b99a0548c1b67c2.gif"
};

// Bầu Cua constants
const BAU_CUA_ANIMALS = ['bầu', 'cua', 'cá', 'nai', 'tôm', 'gà'];
const BAU_CUA_EMOJIS = {
    'bầu': '🍐',
    'cua': '🦀',
    'cá': '🐟',
    'nai': '🦌',
    'tôm': '🦐',
    'gà': '🐔'
};

// Tỷ Phú constants
const BOARD = [
    {"name": "Phố cổ Hà Nội", "type": "land", "region": 1, "price": 120, "rent": [8, 40, 100, 300, 450, 600], "color": "red"},
    {"name": "Cố đô Huế", "type": "land", "region": 1, "price": 100, "rent": [6, 30, 90, 270, 400, 550], "color": "red"},
    {"name": "Hải Phòng", "type": "land", "region": 1, "price": 140, "rent": [10, 50, 150, 450, 625, 750], "color": "red"},
    {"name": "Ga Sài Gòn", "type": "station", "region": 1, "price": 200, "rent": [25, 50, 100, 200]},
    {"name": "Thẻ Hên Xui", "type": "chance"},
    {"name": "Thanh Hóa", "type": "land", "region": 1, "price": 180, "rent": [14, 70, 200, 550, 750, 950], "color": "yellow"},
    {"name": "Hội An", "type": "land", "region": 1, "price": 160, "rent": [12, 60, 180, 500, 700, 900], "color": "yellow"},
    {"name": "Tù", "type": "jail"},
    {"name": "Đà Lạt", "type": "land", "region": 1, "price": 220, "rent": [18, 90, 250, 700, 875, 1050], "color": "green"},
    {"name": "Vịnh Hạ Long", "type": "land", "region": 1, "price": 200, "rent": [16, 80, 220, 600, 800, 1000], "color": "green"},
    {"name": "Bình Định", "type": "land", "region": 2, "price": 240, "rent": [20, 100, 300, 750, 925, 1100], "color": "green"},
    {"name": "Ga Hà Nội", "type": "station", "price": 200, "rent": [25, 50, 100, 200]},
    {"name": "Núi Bà Đen", "type": "land", "region": 2, "price": 260, "rent": [22, 110, 330, 800, 975, 1150], "color": "dark_blue"},
    {"name": "Thẻ Hên Xui", "type": "chance"},
    {"name": "Cao Bằng", "type": "land", "region": 2, "price": 280, "rent": [24, 120, 360, 850, 1025, 1200], "color": "dark_blue"},
    {"name": "Cầu Rồng", "type": "land", "region": 2, "price": 300, "rent": [26, 130, 390, 900, 1100, 1275], "color": "light_purple"},
    {"name": "Mũi Né", "type": "land", "region": 2, "price": 320, "rent": [28, 150, 450, 1000, 1200, 1400], "color": "light_purple"},
    {"name": "Nam Du", "type": "land", "region": 2, "price": 350, "rent": [35, 175, 500, 1100, 1300, 1500], "color": "light_purple"},
    {"name": "Ô Vận Mệnh", "type": "community_chest"},
    {"name": "Ga Huế", "type": "station", "price": 200, "rent": [25, 50, 100, 200]},
    {"name": "Cần Thơ", "type": "land", "region": 3, "price": 400, "rent": [50, 200, 600, 1400, 1700, 2000], "color": "orange"},
    {"name": "Bến Tre", "type": "land", "region": 2, "price": 380, "rent": [37, 185, 550, 1250, 1500, 1750], "color": "orange"},
    {"name": "Vĩnh Long", "type": "land", "region": 3, "price": 420, "rent": [55, 220, 650, 1500, 1800, 2100], "color": "orange"},
    {"name": "Phú Quốc", "type": "land", "region": 3, "price": 450, "rent": [60, 240, 720, 1600, 1950, 2200], "color": "light_blue"},
    {"name": "Quẻ Hên Xui", "type": "chance"},
    {"name": "Vũng Tàu", "type": "land", "region": 3, "price": 500, "rent": [70, 280, 750, 1800, 2000, 2200], "color": "light_blue"},
    {"name": "Phú Yên", "type": "land", "region": 3, "price": 520, "rent": [75, 300, 800, 1900, 2100, 2300], "color": "light_blue"},
    {"name": "Ga Đà Nẵng", "type": "station", "price": 200, "rent": [25, 50, 100, 200]},
    {"name": "Nghệ An", "type": "land", "region": 3, "price": 550, "rent": [80, 320, 850, 2000, 2200, 2400], "color": "pink"},
    {"name": "Long An", "type": "land", "region": 3, "price": 600, "rent": [90, 360, 900, 2200, 2400, 2600], "color": "pink"},
    {"name": "TP HCM", "type": "land", "region": 3, "price": 650, "rent": [100, 400, 1000, 2500, 2750, 3000], "color": "pink"},
    {"name": "Điểm Xuất Phát", "type": "start"}
];

// Thẻ Hên Xui
const CHANCE_CARDS = [
    // 10 thẻ tốt
    ["💰 Nhặt được ví tiền", 200],
    ["🎯 Trúng số độc đắc", 500],
    ["🎁 Tặng lượt đi nữa", "extra_turn"],
    ["🛡️ Được miễn phạt 1 lần", "shield"],
    ["🏠 Nhận đất miễn phí", "free_land"],
    ["💸 Hoàn thuế", 300],
    ["🚀 Tăng tốc 5 ô", "advance_5"],
    ["🎉 Thắng giải địa phương", 150],
    ["📈 Kinh doanh có lãi", 250],
    ["🎂 Nhận quà sinh nhật", 100],
    // 10 thẻ xấu
    ["💸 Làm rơi ví – mất 200 Nene", -200],
    ["🚓 Vào tù vì gây rối", "jail"],
    ["💀 Bị lừa đảo – mất 100 Nene", -100],
    ["🔙 Lùi lại 3 ô", "back_3"],
    ["💥 Sửa nhà – mất 150 Nene", -150],
    ["🏦 Phí bảo trì đất", -250],
    ["🚨 Phạt giao thông", -100],
    ["🌪️ Bão làm hỏng đất – mất 300 Nene", -300],
    ["💳 Thanh toán hóa đơn", -200],
    ["🔥 Cháy nhà – mất 400 Nene", -400]
];

const COMMUNITY_CHEST_CARDS = [
    ["💰 Thưởng từ ngân hàng", 200],
    ["🎉 Thắng cuộc thi sắc đẹp", 100],
    ["📈 Đầu tư sinh lời", 300],
    ["🎁 Nhận quà từ thiện", 150],
    ["🛠️ Hỗ trợ sửa chữa miễn phí", 200],
    ["🏆 Giải thưởng cộng đồng", 250],
    ["💸 Hoàn tiền thuế", 300],
    ["🎂 Quà sinh nhật", 100],
    ["📜 Thừa kế tài sản", 400],
    ["🎯 Trúng số nhỏ", 150],
    ["💳 Nhận tiền bảo hiểm", 200],
    ["🌟 Được khen thưởng", 100],
    ["📦 Nhận hàng viện trợ", 250],
    ["🎭 Tham gia lễ hội có thưởng", 300],
    ["🏦 Ngân hàng trả lãi", 150],
    ["🎤 Thắng cuộc thi hát", 200],
    ["📚 Học bổng cộng đồng", 250],
    ["🎳 Thắng giải bowling", 100],
    ["🖼️ Bán tranh được tiền", 300],
    ["🎬 Tham gia phim nhận thù lao", 400]
];

// City constants
const HOUSE_IMAGES = {
    "nhatro": "https://i.pinimg.com/originals/5d/96/04/5d9604ad0c3475399e1387c2aa3b0b27.gif",
    "nhatuong": "https://i.pinimg.com/originals/d1/30/d6/d130d69f6bfbcde0e55ca10943d51768.gif",
    "nhalau": "https://i.pinimg.com/originals/8c/fa/f4/8cfaf4b1d9d066c1329510704270cd7d.gif",
    "bietthu": "https://i.pinimg.com/originals/2f/9f/c9/2f9fc94da4ff230ede6d63f1d8c651a5.gif"
};

const JOB_IMAGES = {
    "nhabao": "https://i.pinimg.com/originals/88/4e/cb/884ecb28e4132c084ec6be43a90e495b.gif",
    "mc": "https://i.pinimg.com/originals/e2/7e/5e/e27e5e9c64d69ccd201528c0444e626e.gif",
    "thungan": "https://i.pinimg.com/originals/fb/68/ca/fb68ca28236cc083d339f9afe5604939.gif",
    "trom": "https://i.pinimg.com/originals/37/27/af/3727afbe6ca619733cba6c07a6c4fcd7.gif",
    "congan": "https://i.pinimg.com/originals/b7/30/40/b73040aa7dc7d504566980173240a5f0.gif"
};

// Pet system constants - Bổ sung thêm cho hệ thống Pet
const PET_INFO = {
    "Mèo Anh Lông Ngắn": { price: 100, emoji: "🐱" },
    "Chó InuShiba": { price: 100, emoji: "🐶" },
    "Chó Husky": { price: 100, emoji: "🐺" },
    "Mèo Anh Lông Dài": { price: 100, emoji: "🐱" },
    "Thỏ Ngọc": { price: 100, emoji: "🐰" },
    "Cá Mập": { price: 100, emoji: "🦈" },
    "Chim Cu": { price: 100, emoji: "🐦" },
    "Kong": { price: 100, emoji: "🦍" },
    "Godzilla": { price: 100, emoji: "🦖" }
};

// City system constants - Bổ sung thêm cho hệ thống City
const JOB_TYPES = {
    "trom": {
        name: "Trộm",
        minIncome: 0,
        maxIncome: 0,
        requiredHouse: ["nhatro"],
        riskChance: 0.3,
        description: "Trộm cây của người khác trong server. Có thể bị công an bắt!",
        workType: "steal_trees", // Trộm cây từ farm của người khác
        cooldown: 2 * 60 * 60 * 1000 // 2 giờ
    },
    "nhabao": {
        name: "Nhà Báo",
        minIncome: 0,
        maxIncome: 0,
        requiredHouse: ["nhatuong", "nhalau", "bietthu"],
        riskChance: 0,
        description: "Viết bài báo bằng cách chat trong server. 50 tin nhắn = hoàn thành",
        workType: "chat_messages", // Chat trong server
        targetMessages: 50,
        rewardPerMessage: 5, // 5 Rin/tin nhắn
        cooldown: 4 * 60 * 60 * 1000 // 4 giờ
    },
    "mc": {
        name: "MC",
        minIncome: 0,
        maxIncome: 0,
        requiredHouse: ["nhatuong", "nhalau", "bietthu"],
        riskChance: 0,
        description: "Dẫn chương trình, ngồi room voice đủ 15 phút/ngày để nhận thưởng.",
        workType: "voice",
        minVoiceMinutes: 15,
        rewardPerDay: 120, // 120 Rin/ngày
        cooldown: 4 * 60 * 60 * 1000 // 4 giờ
    },
    "congan": {
        name: "Công An",
        minIncome: 200,
        maxIncome: 400,
        requiredHouse: ["bietthu"],
        riskChance: 0,
        description: "Bắt trộm trong server. Nhận thông báo khi có người trộm và có thể bắt họ",
        workType: "catch_thieves", // Bắt trộm
        catchWindow: 10 * 60 * 1000, // 10 phút để bắt trộm
        puzzleReward: 500, // Thưởng khi giải đúng đố
        cooldown: 1 * 60 * 60 * 1000 // 1 giờ
    }
};

const MISSIONS = {
    "giaohang": {
        name: "Giao Hàng",
        duration: 30, // phút
        reward: 100,
        emoji: "📦",
        description: "Nhiệm vụ giao hàng cơ bản"
    },
    "donvesinh": {
        name: "Dọn Vệ Sinh",
        duration: 60,
        reward: 200,
        emoji: "🧹",
        description: "Dọn dẹp khu vực công cộng"
    },
    "baove": {
        name: "Bảo Vệ",
        duration: 120,
        reward: 400,
        emoji: "🛡️",
        description: "Bảo vệ an ninh khu vực"
    },
    "quanly": {
        name: "Quản Lý",
        duration: 240,
        reward: 800,
        emoji: "💼",
        description: "Quản lý và điều phối công việc"
    }
};

// Hệ thống câu đố cho công an
const POLICE_PUZZLES = [
    {
        question: "2 + 3 = ?",
        answer: "5",
        difficulty: "easy"
    },
    {
        question: "Thủ đô của Việt Nam là gì?",
        answer: "hà nội",
        difficulty: "easy"
    },
    {
        question: "10 x 3 = ?",
        answer: "30",
        difficulty: "medium"
    },
    {
        question: "Con vật nào bay được mà không phải chim?",
        answer: "dơi",
        difficulty: "medium"
    },
    {
        question: "Năm nay là năm bao nhiêu?",
        answer: "2025",
        difficulty: "easy"
    },
    {
        question: "Ai là tác giả của 'Truyện Kiều'?",
        answer: "nguyễn du",
        difficulty: "hard"
    },
    {
        question: "15 + 27 = ?",
        answer: "42",
        difficulty: "medium"
    },
    {
        question: "Con gì vừa biết bơi vừa biết bay?",
        answer: "vịt",
        difficulty: "medium"
    }
];

// Thông báo cho các hoạt động nghề nghiệp
const JOB_NOTIFICATIONS = {
    steal_attempt: "🚨 **CẢNH BÁO TRỘM CẮP!** 🚨\n{thief} đang cố gắng trộm cây của {victim}!\nCông an có 10 phút để bắt giữ!",
    steal_success: "💰 {thief} đã trộm thành công {amount} Rin từ cây của {victim}!",
    steal_failed: "❌ {thief} đã trộm thất bại!",
    police_catch: "👮‍♂️ {police} đã bắt được tên trộm {thief} và nhận {reward} Rin!",
    police_fail: "😅 {police} đã cố bắt {thief} nhưng giải sai câu đố!",
    work_complete: "✅ {user} đã hoàn thành công việc {job} và nhận {reward} Rin!"
};

// General constants
const GAME_LIMITS = {
    minBet: 10,
    maxBet: 10000,
    cooldown: 30000 // 30 giây
};

const ECONOMY = {
    dailyBonus: 100,
    workCooldown: 4 * 60 * 60 * 1000, // 4 giờ
    repairInterval: 5 * 24 * 60 * 60 * 1000 // 5 ngày
};

const COLORS = {
    success: '#00FF00',
    error: '#FF6B6B',
    warning: '#FFD700',
    info: '#66CCFF',
    pet: '#FF69B4',
    city: '#0099FF'
};

const EMOJIS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    money: '💰',
    house: '🏠',
    job: '💼',
    pet: '🐾',
    time: '⏰'
};

module.exports = {
    PET_TYPES,
    PET_IMAGES,
    PET_INFO,
    TREE_VALUES,
    TREE_IMAGES,
    BAU_CUA_ANIMALS,
    BAU_CUA_EMOJIS,
    BOARD,
    CHANCE_CARDS,
    COMMUNITY_CHEST_CARDS,
    HOUSE_IMAGES,
    JOB_IMAGES,
    JOB_TYPES,
    MISSIONS,
    GAME_LIMITS,
    ECONOMY,
    COLORS,
    EMOJIS,
    POLICE_PUZZLES,
    JOB_NOTIFICATIONS
}; 