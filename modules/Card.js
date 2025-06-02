class Card {
    static suits = ["clubs", "diamonds", "hearts", "spades"];
    
    constructor(suit, value, down = false) {
        this.suit = suit;
        this.value = value;
        this.down = down;
        this.symbol = this.name[0].toUpperCase();
    }

    get name() {
        if (this.value <= 10) return this.value.toString();
        
        const nameMap = {
            11: 'jack',
            12: 'queen', 
            13: 'king',
            14: 'ace'
        };
        
        return nameMap[this.value];
    }

    get image() {
        if (this.down) return "red_back.png";
        
        const symbol = this.name !== '10' ? this.symbol : '10';
        const suitChar = this.suit[0].toUpperCase();
        
        return `${symbol}${suitChar}.png`;
    }

    flip() {
        this.down = !this.down;
        return this;
    }

    toString() {
        const name = this.name.charAt(0).toUpperCase() + this.name.slice(1);
        const suit = this.suit.charAt(0).toUpperCase() + this.suit.slice(1);
        return `${name} of ${suit}`;
    }
}

module.exports = Card; 