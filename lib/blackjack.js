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
var jobs = require('./jobs');
const crypto = require("crypto");

// Keeps track of the different games going on
var messageMap = new Map();

// Gets random number between 2 ints using cryptographic random... 
// people kept complaining it wasn't random enough... OK crypto it is
function rand(min, max) {
    return crypto.randomInt(min, max);
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

// Used at start of game for creating the starting hands
function createCardCollection(bet) {
    var cardsObj = {
        userTotal: [],
        botTotal: [],
        bet: bet,
        options: ["hit", "stand", "surrender", "double down"],
        isSplit: false,
        isInsured: false
    }

    var userBase1 = new Card(randCard());
    var userBase2 = new Card(randCard());

    var compBase1 = new Card([" ", " "]);
    var compBase2 = new Card(randCard());

    cardsObj.userTotal.push(userBase1);
    cardsObj.userTotal.push(userBase2);

    cardsObj.botTotal.push(compBase1);
    cardsObj.botTotal.push(compBase2);

    if (compBase2.val == "A") cardsObj.options.push("insurance");
    if (userBase1.val == userBase2.val) cardsObj.options.push("split");
    return cardsObj;
}

// Initialized the game
function startGame(interaction, args) {
    if (args.data.length < 1) {
        interaction.reply("Not enough arguments provided. \n !blackjack <bet> - Starts a blackjack card game against the bot; get a higher total to earn your bet, or a total of 21 for double your bet.");
        return;
    }

    if (!interaction.channel) {
        interaction.reply(`Blackjack currently not supported in DM's!`);
        return;
    }

    var bet = parseInt(args.get('bet').value);
    var user = interaction.user.id;
    var bal = wallet.getWallet(user);
    var botbal = wallet.getWallet(defaultConfig.botId);

    if (messageMap.get(user)) {
        interaction.reply(`You already have an ongoing game!`);
        return;
    }

    if (( bet >= appConfig.minBet && bet <= appConfig.maxBet) || (jobs.hasJob(user) && bet >= appConfig.minBet && bet <= appConfig.maxBet * 2) ) {
        if (bet && !isNaN(bet) && (bet <= bal)) {
            if (bet * 2 <= botbal) {
                var cardsObj = createCardCollection(bet);
                var userTotal = arrCardCalc(cardsObj.userTotal);
                var bet = cardsObj.bet;

                // Check for user win off start
                if (userTotal == 21 && cardsObj.userTotal.length == 2) {
                    //User blackjack - end game (win)
                    wallet.subtractPoints(defaultConfig.botId,  Math.round(bet*1.5));
                    wallet.addPoints(user, Math.round(bet * 1.5));
                    wallet.updateMessage();
                    console.log(messageMap);
                    var status =  `\"${wallet.getNickFromID(user)} has Blackjack; **${wallet.getNickFromID(user)} Wins, 1.5x the winning amount**!\"`;
                    gameDisplay(interaction, cardsObj, status).then( () => messageMap.delete(user));
                    console.log(messageMap);
                    return;
                }

                optionSelect(cardsObj, interaction)

            } else interaction.reply(`The bot doesn't have enough to bet!`);
        } else interaction.reply(`Please specify a valid bet that is less than or equal to your current balance.\nEx: \`!blackjack 50\` starts a game with 50 ${appConfig.coinName} at stake.`);
    } else interaction.reply(`The max bet for on normal tables is ${appConfig.maxBet}, highroller max bet is ${appConfig.maxBet * 2}, and the minimum bet is ${appConfig.minBet}!`);
}

function optionSelect(cardsObj, interaction) {
    var user = interaction.user.id;

    gameDisplay(interaction, cardsObj, `\"${wallet.getNickFromID(user)}, Type an option: ["${cardsObj.options.join('", "')}"].\"`);

    const filter = m => ( cardsObj.options.includes(m.content.toLowerCase()) ) && m.author.id === user;
    const collector = interaction.channel.createMessageCollector({filter, max: 1, time: 100000});

    collector.on('collect', m => {
        if (m.content.toLowerCase() === 'hit') userHit(cardsObj, interaction);
        else if (m.content.toLowerCase() === 'stand') userStand(cardsObj, interaction);
        else if (m.content.toLowerCase() === 'surrender') userSurrender(cardsObj, interaction);
        else if (m.content.toLowerCase() === 'split') userSplit(cardsObj, interaction);
        else if (m.content.toLowerCase() === 'insurance') userInsurance(cardsObj, interaction);
        else if (m.content.toLowerCase() === 'double down') userDoubleDown(cardsObj, interaction);
        m.delete().catch(err => {});
    });
    
    collector.on('end', (collected, reason) => {
        if (reason && reason === 'time') {
            userStand(cardsObj, interaction);
            gameDisplay(interaction, cardsObj, `\"Forced stand due to no response.\"`);
        } 
    });
}

// Represents a user standing. Starts bot's turn.
function userStand(cardsObj, interaction) {
    var status = `\"${wallet.getNickFromID(interaction.user.id)} stands with: ${arrCardCalc(cardsObj.userTotal)}.\"`;
    gameDisplay(interaction, cardsObj, status);
    // Starting bot's turn
    setTimeout(() => {
        var status = "\"" + appConfig.coinName + ` is thinking...\"`
        gameDisplay(interaction, cardsObj, status);
        setTimeout(() => {
            cardsObj.botTotal.shift();
            botHit(cardsObj, interaction);
        }, 1000);
    }, 1000);
}

// Represents a user surrendering. Ends the game.
function userSurrender(cardsObj, interaction) {
    var bet = cardsObj.bet;
    var user = interaction.user.id;
    var status = `\"${wallet.getNickFromID(user)} surrenders with: ${arrCardCalc(cardsObj.userTotal)}.\"`;
    gameDisplay(interaction, cardsObj, status).then( () => messageMap.delete(user));
    wallet.addPoints(defaultConfig.botId,  Math.round(bet * 0.5));
    wallet.subtractPoints(user, Math.round(bet * 0.5));
    wallet.updateMessage();
    return;
}

// Represents a user getting insurance.
function userInsurance(cardsObj, interaction) {
    // TODO: CHECK IF THEY HAVE ENOUGH FOR INSURANCE
    var status = `\"${wallet.getNickFromID(interaction.user.id)} gets insurance against the house.\"`;
    gameDisplay(interaction, cardsObj, status);
    cardsObj.isInsured = true;
    cardsObj.options.splice(cardsObj.options.indexOf('insurance'));
    setTimeout(() => {
        optionSelect(cardsObj, interaction);
    }, 1000);
}

// Represents a user doubling down.
function userDoubleDown(cardsObj, interaction) {
    // TODO: CHECK IF THEY HAVE ENOUGH TO DOUBLE DOWN
    var bal = wallet.getWallet(user);
    if (bal > cardsObj.bet * 2) {
        // Doubling the bet
        cardsObj.bet *= 2;
        var user = interaction.user.id;
        var status = `\"${wallet.getNickFromID(user)} chooses to double down with ${arrCardCalc(cardsObj.userTotal)}! Drawing...\"`;
        gameDisplay(interaction, cardsObj, status).then( () => messageMap.delete(user));

        setTimeout(() => {
            // Draw a new card
            var card = new Card(randCard());
            cardsObj.userTotal.push(card);

            // Get our new total
            var total = arrCardCalc(cardsObj.userTotal);
            var bet = cardsObj.bet;

            if (total > 21) {
                //User busted - end game (loss)
                wallet.subtractPoints(user, bet);
                wallet.addPoints(defaultConfig.botId, bet);
                wallet.updateMessage();
                var status = `\"${wallet.getNickFromID(user)} Busted; House Wins, **${wallet.getNickFromID(user)} Loses**\".`
                gameDisplay(interaction, cardsObj, status);
                messageMap.delete(user);
            } else userStand(cardsObj, interaction);
        }, 1000);
    } else {
        var status = `\"You don't have enough money to double down!\"`;
        gameDisplay(interaction, cardsObj, status);
        setTimeout(() => {optionSelect(cardsObj, interaction);}, 1000);
    }
    
    return;
}

// Represents a user turn
function userHit(cardsObj, interaction) {
    var user = interaction.user.id;

    // Draw a new card
    var card = new Card(randCard());
    cardsObj.userTotal.push(card);

    // Get our new total
    var total = arrCardCalc(cardsObj.userTotal);
    var bet = cardsObj.bet;

    // set our new options
    cardsObj.options = ["hit", "stand"];

    if (total > 21) {
        //User busted - end game (loss)
        wallet.subtractPoints(user, bet);
        wallet.addPoints(defaultConfig.botId, bet);
        wallet.updateMessage();
        var status = `\"${wallet.getNickFromID(user)} Busted; House Wins, **${wallet.getNickFromID(user)} Loses**\".`
        gameDisplay(interaction, cardsObj, status);
        messageMap.delete(user);
    } else {
        // Users can select another option.
        optionSelect(cardsObj, interaction);
    }
}

// Represents a bot turn
function botHit(cardsObj, interaction) {
    var user = interaction.user.id;
    var card = new Card(randCard());
    var userTotal = arrCardCalc(cardsObj.userTotal);
    var bet = cardsObj.bet;
    cardsObj.botTotal.push(card);
    var botTotal = arrCardCalc(cardsObj.botTotal);

    if (botTotal > 21) {
        //Computer busted - end game (user win)
        wallet.addPoints(user, bet);
        wallet.subtractPoints(defaultConfig.botId, bet);
        wallet.updateMessage();
        var status = "\"" + appConfig.coinName + ` Busted; **${wallet.getNickFromID(user)} Wins**\"`;
        gameDisplay(interaction, cardsObj, status);
        messageMap.delete(user);
    }
    else if (botTotal >= 17) {
        // Computer stands
        if (botTotal == 21 && cardsObj.botTotal.length == 2) {
            wallet.subtractPoints(user, bet);
            wallet.addPoints(defaultConfig.botId, bet);
            wallet.updateMessage();
            var status = "\"" + appConfig.coinName + ` has Blackjack; House Wins, **${wallet.getNickFromID(user)} Loses**\"`
            gameDisplay(interaction, cardsObj, status);
            messageMap.delete(user);
        }
        else if (botTotal > userTotal) {
            // Computer has larger number - end game (user loss)
            wallet.subtractPoints(user, bet);
            wallet.addPoints(defaultConfig.botId, bet);
            wallet.updateMessage();
            var status = "\"" + appConfig.coinName + ` stands with ${botTotal}: House Wins, **${wallet.getNickFromID(user)} Loses**\"`;
            gameDisplay(interaction, cardsObj, status);
            messageMap.delete(user);
        }
        else if (botTotal == userTotal) {
            // It's a tie
            var status = "\"" + appConfig.coinName + ` stands with ${botTotal}: **It's a tie**.\"`
            gameDisplay(interaction, cardsObj, status);
            messageMap.delete(user);
        } else {
            // Computer has smaller number - end game (user win)
            wallet.addPoints(user, bet);
            wallet.subtractPoints(defaultConfig.botId, bet);
            wallet.updateMessage();
            var status = "\"" + appConfig.coinName + ` stands with ${botTotal}: **${wallet.getNickFromID(user)} Wins**\"`;
            gameDisplay(interaction, cardsObj, status);
            messageMap.delete(user);
        }
    } 
    else {
        // Computer continues hitting
        var status = "\"" + appConfig.coinName + ` is thinking...\"`
        gameDisplay(interaction, cardsObj, status);
        setTimeout(() => {
            botHit(cardsObj, interaction);
        }, 1000);
    }
}

// Controls the game display message.
async function gameDisplay(interaction, cardsObj, status) {
    var gamemsg = `Welcome To ${appConfig.coinName} ${jobs.hasJob(interaction.user.id) ? '\'HIGHROLLER\' ' : ''}Blackjack! Get A Higher Total To Earn Your Bet, Or A Total Of 21 For 3:2 Your Bet. \n
                   ${wallet.getNickFromID(interaction.user.id)} Started A New Blackjack Game With ${cardsObj.bet} ${appConfig.coinName}.\n\n`

    var dealerStatus = `${appConfig.coinName}\t Value: ` + arrCardCalc(cardsObj.botTotal) + "\n";
    var dealerCards = "";
    var playerStatus = `${wallet.getNickFromID(interaction.user.id)}\t Value: ` + arrCardCalc(cardsObj.userTotal) + "\n";
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

    if (interaction.replied) interaction.editReply("```ml\n" + gamemsg + dealerStatus + dealerCards + playerStatus + playerCards + status + "```");
    else {
        interaction.reply("```ml\n" + gamemsg + dealerStatus + dealerCards + playerStatus + playerCards + status + "```")
        .then(sent=>messageMap.set(interaction.user.id, sent));
    }
    
}

function commands() {
    return [
      {
        "name": "blackjack",
        "description": "Starts a blackjack game against the bot; higher total earns your bet, or blackjack for 3:2 your bet.",
        "options": [
          {
            "type": 4,
            "name": "bet",
            "description": "Amount to bet with.",
            "required": true
          }
        ]
      }
    ]
  }

module.exports = {commands, startGame}