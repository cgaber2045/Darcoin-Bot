/*
  _____              _____      _         ____  _            _    _            _    
 |  __ \            / ____|    (_)       |  _ \| |          | |  (_)          | |   
 | |  | | __ _ _ __| |     ___  _ _ __   | |_) | | __ _  ___| | ___  __ _  ___| | __
 | |  | |/ _` | '__| |    / _ \| | '_ \  |  _ <| |/ _` |/ __| |/ / |/ _` |/ __| |/ /
 | |__| | (_| | |  | |___| (_) | | | | | | |_) | | (_| | (__|   <| | (_| | (__|   < 
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |____/|_|\__,_|\___|_|\_\ |\__,_|\___|_|\_\
                                                                _/ |                
                                                               |__/                 

 Blackjack module for the DarCoin Bot modified from Elisif Casino by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Credit to: https://github.com/Cannicide/elisif-casino, some logic taken from that project.
*/

var wallet = require('./wallet');

// Keeps track of the different games going on
var messageMap = new Map();

// Used to keep track of bot statistics
var lostGames = 0;
var wonGames = 0;

// Help function for this module
function help(user) {
    var helpstring = "\n**Blackjack Commands:**\n!blackjack <bet> - Starts a blackjack card game against the bot; get a higher total to earn your bet, or a total of 21 for 3:2 your bet."
    if (user) helpstring += '';
    return helpstring;
}

// Gets random number between 2 ints
function rand(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Gets a card value and represents it as an int
function ToInteger(card) {
    if (card == "A") return 1;
    else if (card == " ") return 0;
    else if (card == "J" || card == "Q" || card == "K") return 10;
    else return parseInt(card);
}

// Represents a card
function Card(value) {
    this.int = ToInteger(value[0]);
    this.val = value[0];
    this.suite = value[1];
}

// Picks a random card
function randCard() {
                // Spades,   Hearts,   Diamonds,  Clubs
    var suites = ["\u2664", "\u2661", "\u2662", "\u2667"];
    var fullCollection = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    
    // Gets a random card and suit
    var randCardInt = rand(0, fullCollection.length-1);
    var randSuit = rand(0, 3);

    // Returns the card
    return [fullCollection[randCardInt], suites[randSuit]];
}

// Calculates the value of a hand
function arrCardCalc(arr) {
    var ace = false;
    var sum = 0;
    for (var x in arr) {
        if (arr[x].int == 1) ace = true;
        sum+=arr[x].int;
    }

    if (ace == true && sum < 12) sum += 10;
    return sum;
}

// Represents a user turn
function userHit(cardsObj, message) {
    var user = message.author;

    // Draw a new card
    var card = new Card(randCard());
    cardsObj.userTotal.push(card);

    // Get our new total
    var total = arrCardCalc(cardsObj.userTotal);
    var bet = cardsObj.bet;

    if (total > 21) {
        //User busted - end game (loss)
        wonGames++;
        console.log("Winrate: " + (wonGames / (wonGames + lostGames)));

        wallet.subtractPoints(user.id, bet);
        wallet.addPoints(defaultConfig.botId, bet);
        wallet.updateMessage();
        var status = `\"${wallet.getNickFromID(user.id)} Busted; House Wins, **${wallet.getNickFromID(user.id)} Loses**\".`
        gameDisplay(message, cardsObj, status);
        messageMap.delete(message.author.id);
    }
    else if (total == 21 && cardsObj.userTotal.length == 2) {
        //User blackjack - end game (win)
        lostGames++;
        console.log("Winrate: " + (wonGames / (wonGames + lostGames)));

        wallet.subtractPoints(defaultConfig.botId, Math.round(bet * 1.5));
        wallet.addPoints(user.id, Math.round(bet * 1.5));
        wallet.updateMessage();
        var status =  `\"${wallet.getNickFromID(user.id)} has Blackjack; **${wallet.getNickFromID(user.id)} Wins, 1.5x the winning amount**!\"`;
        gameDisplay(message, cardsObj, status);
        messageMap.delete(message.author.id);
    }
    else {
        //User can continue hitting
        var status = `\"${wallet.getNickFromID(user.id)}, your total is ${total}, hit or stand? Type 'hit' or 'stand'.\"`;
        gameDisplay(message, cardsObj, status);

        const filter = m => ( m.content.toLowerCase() === 'hit' || m.content.toLowerCase() === 'stand') && m.author.id === message.author.id;

        const collector = message.channel.createMessageCollector(filter, {max: 1, time: 100000});

        collector.on('collect', m => {
            if (m.content.toLowerCase() === 'hit') userHit(cardsObj, message);
            else if (m.content.toLowerCase() === 'stand') userStand(cardsObj, message);
            m.delete().catch((error) => console.log(error));
        });
        
        collector.on('end', (collected, reason) => {
            if (reason && reason === 'time') {
                gameDisplay(message, cardsObj, `\"Blackjack session timed out due to no response.\"`);
                messageMap.delete(message.author.id);
            } 
        });
    }

}

// Represents a bot turn
function botHit(cardsObj, message) {
    var user = message.author;
    var card = new Card(randCard());
    var userTotal = arrCardCalc(cardsObj.userTotal);
    var bet = cardsObj.bet;

    // Check for user win off start
    if (userTotal == 21 && cardsObj.userTotal.length == 2) {
        //User blackjack - end game (win)
        lostGames++;
        console.log("Winrate: " + (wonGames / (wonGames + lostGames)));

        wallet.subtractPoints(defaultConfig.botId,  Math.round(bet*1.5));
        wallet.addPoints(user.id, Math.round(bet * 1.5));
        wallet.updateMessage();
        var status =  `\"${wallet.getNickFromID(user.id)} has Blackjack; **${wallet.getNickFromID(user.id)} Wins, 1.5x the winning amount**!\"`;
        gameDisplay(message, cardsObj, status);
        messageMap.delete(message.author.id);
        return;
    } 

    cardsObj.botTotal.push(card);
    var botTotal = arrCardCalc(cardsObj.botTotal);

    if (botTotal > 21) {
        //Computer busted - end game (user win)
        lostGames++;
        console.log("Winrate: " + (wonGames / (wonGames + lostGames)));

        wallet.addPoints(user.id, bet);
        wallet.subtractPoints(defaultConfig.botId, bet);
        wallet.updateMessage();
        var status = "\"" + appConfig.coinName + ` Busted; **${wallet.getNickFromID(user.id)} Wins**\"`;
        gameDisplay(message, cardsObj, status);
        messageMap.delete(message.author.id);
    }
    else {
        //Computer stands
        if (botTotal == 21 && cardsObj.botTotal.length == 2) {
            //Computer has blackjack
            wonGames++;
            console.log("Winrate: " + (wonGames / (wonGames + lostGames)));

            wallet.subtractPoints(user.id, bet);
            wallet.addPoints(defaultConfig.botId, bet);
            wallet.updateMessage();
            var status = "\"" + appConfig.coinName + ` has Blackjack; House Wins, **${wallet.getNickFromID(user.id)} Loses**\"`
            gameDisplay(message, cardsObj, status);
            messageMap.delete(message.author.id);
        }
        else if (botTotal > userTotal) {
            //Computer has larger number - end game (user loss)
            wonGames++;
            console.log("Winrate: " + (wonGames / (wonGames + lostGames)));

            wallet.subtractPoints(user.id, bet);
            wallet.addPoints(defaultConfig.botId, bet);
            wallet.updateMessage();
            var status = "\"" + appConfig.coinName + ` stands with ${botTotal}: House Wins, **${wallet.getNickFromID(user.id)} Loses**\"`;
            gameDisplay(message, cardsObj, status);
            messageMap.delete(message.author.id);
        }
        else if (botTotal == userTotal) {
            //It's a tie
            var status = "\"" + appConfig.coinName + ` stands with ${botTotal}: **It's a tie**.\"`
            gameDisplay(message, cardsObj, status);
            messageMap.delete(message.author.id);
        }
        else {
            var status = "\"" + appConfig.coinName + ` is thinking...\"`
            gameDisplay(message, cardsObj, status);
            //Computer continues hitting
            setTimeout(() => {
                botHit(cardsObj, message);
            }, 1500);
        }
    }
    
}

// Used at start of game for starting hands
function createCardCollection(bet) {
    var cardsObj = {
        userTotal: [],
        botTotal: [],
        bet: bet
    }

    var userBase1 = new Card(randCard());
    var userBase2 = new Card(randCard());

    var compBase1 = new Card([" ", " "]);
    var compBase2 = new Card(randCard());

    cardsObj.userTotal.push(userBase1);
    cardsObj.userTotal.push(userBase2);

    cardsObj.botTotal.push(compBase1);
    cardsObj.botTotal.push(compBase2);
    return cardsObj;
}

// Initialized the game
function startGame(message, args) {
    if (args.length < 1) {
        message.reply("Not enough arguments provided. \n !blackjack <bet> - Starts a blackjack card game against the bot; get a higher total to earn your bet, or a total of 21 for double your bet.");
        return;
    }

    var bet = parseInt(args[0]);
    var user = message.author;
    var bal = wallet.getWallet(user.id);
    var botbal = wallet.getWallet(defaultConfig.botId);
    messageMap.delete(message.author.id);

    if (bet >= appConfig.minBet && bet <= appConfig.maxBet) {
        if (bet && !isNaN(bet) && (bet <= bal)) {
            if (bet * 2 <= botbal) {
                var cardsObj = createCardCollection(bet);

                gameDisplay(message, cardsObj, `\"${wallet.getNickFromID(user.id)}, hit or stand? Type 'hit' or 'stand'.\"`);

                const filter = m => ( m.content.toLowerCase() === 'hit' || m.content.toLowerCase() === 'stand') && m.author.id === message.author.id;
            
                const collector = message.channel.createMessageCollector(filter, {max: 1, time: 100000});

                collector.on('collect', m => {
                    if (m.content.toLowerCase() === 'hit') userHit(cardsObj, message);
                    else if (m.content.toLowerCase() === 'stand') userStand(cardsObj, message);
                    m.delete().catch((error) => console.log(error));
                });

                collector.on('end', (collected, reason) => {
                    if (reason && reason === 'time') {
                        gameDisplay(message, cardsObj, `\"Blackjack session timed out due to no response.\"`);
                        messageMap.delete(message.author.id);
                    } 
                });
                
            } else {
                message.channel.send(`The bot doesn't have enough to bet!`);
            }
        }
        else {
            message.channel.send(`Please specify a valid bet that is less than or equal to your current balance.\nEx: \`!blackjack 50\` starts a game with 50 ${appConfig.coinName} at stake.`);
        }
    } else {
        message.channel.send(`The max bet is ` + appConfig.maxBet + " and the minimum bet is " + appConfig.minBet + "!");
    }

}

// Represents a user standing. Starts bot's turn.
function userStand(cardsObj, message) {
    var status = `${wallet.getNickFromID(message.author.id)} stands with: ${arrCardCalc(cardsObj.userTotal)}.`;
    gameDisplay(message, cardsObj, status);
    cardsObj.botTotal.shift();
    return botHit(cardsObj, message);
}

// Controls the game display message.
function gameDisplay(message, cardsObj, status) {
    var messageId = messageMap.get(message.author.id);

    var gamemsg = `Welcome To ${appConfig.coinName} Blackjack! Get A Higher Total To Earn Your Bet, Or A Total Of 21 For 3:2 Your Bet. \n
                   ${wallet.getNickFromID(message.author.id)} Started A New Blackjack Game With ${cardsObj.bet} ${appConfig.coinName}.\n\n`

    var dealerStatus = `${appConfig.coinName}\t Value: ` + arrCardCalc(cardsObj.botTotal) + "\n";
    var dealerCards = "";
    var playerStatus = `${wallet.getNickFromID(message.author.id)}\t Value: ` + arrCardCalc(cardsObj.userTotal) + "\n";
    var playerCards = "";

    for (i=0;i<cardsObj.botTotal.length;i++) {
        var card = cardsObj.botTotal[i];
        dealerCards += "|" + card.val + " " + card.suite + "| ";
    }
    dealerCards += "\n\n";

    for (i=0;i<cardsObj.userTotal.length;i++) {
        var card = cardsObj.userTotal[i];
        playerCards += "|" + card.val + " " + card.suite + "| ";
    }
    playerCards += "\n\n";

    if (messageId) {
        messageId.edit("```ml\n" + gamemsg + dealerStatus + dealerCards + playerStatus + playerCards + status + "```");
    } else {
        message.channel.send("```ml\n" + gamemsg + dealerStatus + dealerCards + playerStatus + playerCards + status + "```").then(sent=>messageMap.set(message.author.id, sent));
    }
    
}

module.exports = {help, startGame}