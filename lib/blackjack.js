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
const internal = require('stream');

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
        userTotal2: [], // used for split hands
        botTotal: [],
        bet: bet,
        options: ["hit", "stand", "surrender", "double down"],
        isSplit: false,
        handOneDone: false,
        handTwoDone: false,
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
                    var status =  `\"${wallet.getNickFromID(user)} has Blackjack; **${wallet.getNickFromID(user)} Wins, 1.5x the winning amount**!\"`;
                    gameDisplay(interaction, cardsObj, status);
                    messageMap.delete(user);
                    return;
                }

                optionSelect(cardsObj, interaction)

            } else interaction.reply(`The bot doesn't have enough to bet!`);
        } else interaction.reply(`Please specify a valid bet that is less than or equal to your current balance.\nEx: \`!blackjack 50\` starts a game with 50 ${appConfig.coinName} at stake.`);
    } else interaction.reply(`The max bet for on normal tables is ${appConfig.maxBet}, highroller max bet is ${appConfig.maxBet * 2}, and the minimum bet is ${appConfig.minBet}!`);
}

function optionSelect(cardsObj, interaction) {
    var user = interaction.user.id;

    var status;
    if (cardsObj.isSplit && !cardsObj.handOneDone) var status = `\"${wallet.getNickFromID(user)}, Type an option for hand one: ["${cardsObj.options.join('", "')}"].\"`;
    else if (cardsObj.isSplit && cardsObj.handOneDone) var status = `\"${wallet.getNickFromID(user)}, Type an option for hand two: ["${cardsObj.options.join('", "')}"].\"`;
    else status = `\"${wallet.getNickFromID(user)}, Type an option: ["${cardsObj.options.join('", "')}"].\"`;
    gameDisplay(interaction, cardsObj, status);

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
            if (cardsObj.isSplit && !cardsObj.handOneDone) {
                cardsObj.handOneDone = true;
                optionSelect(cardsObj, interaction);
            } else if (cardsObj.isSplit && !cardsObj.handTwoDone) {
                setTimeout(() => {
                    var status = `\"${appConfig.coinName} is thinking...\"`
                    gameDisplay(interaction, cardsObj, status);
                    botHit(cardsObj, interaction);
                }, 1000);
            } else {
                setTimeout(() => {
                    var status = `\"${appConfig.coinName} is thinking...\"`
                    gameDisplay(interaction, cardsObj, status);
                    cardsObj.botTotal.shift();
                    botHit(cardsObj, interaction);
                }, 1000);                
            }
    }, 1000);
}

// Represents a user splitting.
function userSplit(cardsObj, interaction) {
    var user = interaction.user.id;
    var bal = wallet.getWallet(user);
    if (bal > cardsObj.bet * 2) {
        cardsObj.isSplit = true;
        // Splitting the cards into 2 hands:
        cardsObj.userTotal2.push(cardsObj.userTotal.pop());

        // Draw a card to both hands:
        cardsObj.userTotal.push(new Card(randCard()));
        cardsObj.userTotal2.push(new Card(randCard()));
        
        cardsObj.options.splice(cardsObj.options.indexOf('split'));
        cardsObj.options.splice(cardsObj.options.indexOf('surrender'));

        var status = `\"${wallet.getNickFromID(interaction.user.id)} splits!\"`;
        gameDisplay(interaction, cardsObj, status);
        setTimeout(() => {optionSelect(cardsObj, interaction);}, 1000);

    } else {
        var status = `\"You don't have enough money to split!\"`;
        gameDisplay(interaction, cardsObj, status);
        setTimeout(() => {optionSelect(cardsObj, interaction);}, 1000);
    }
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
    var user = interaction.user.id;
    var bal = wallet.getWallet(user);
    if (bal > cardsObj.bet * 2) {
        cardsObj.isInsured = true;
        cardsObj.options.splice(cardsObj.options.indexOf('insurance'));
        setTimeout(() => {
            optionSelect(cardsObj, interaction);
        }, 1000);
    } else {
        var status = `\"You don't have enough money to buy insurance!\"`;
        gameDisplay(interaction, cardsObj, status);
        setTimeout(() => {optionSelect(cardsObj, interaction);}, 1000);
    }
}

// Represents a user doubling down.
function userDoubleDown(cardsObj, interaction) {
    var user = interaction.user.id;
    var bal = wallet.getWallet(user);
    if (bal > cardsObj.bet * 2) {
        // Doubling the bet
        cardsObj.bet *= 2;
        var status = `\"${wallet.getNickFromID(user)} chooses to double down with ${arrCardCalc(cardsObj.userTotal)}! Drawing...\"`;
        gameDisplay(interaction, cardsObj, status).then( () => messageMap.delete(user));

        setTimeout(() => {
            // Draw a new card
            var card = new Card(randCard());
            cardsObj.userTotal.push(card);
            // Get our new total
            var total = arrCardCalc(cardsObj.userTotal);
            if (total > 21) {
                //User busted - end game (loss)
                var status = `\"${wallet.getNickFromID(user)} Busted; House Wins, **${wallet.getNickFromID(user)} Loses**\".`
                botWin(cardsObj, interaction, status);
            } else userStand(cardsObj, interaction);
        }, 2000);
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
    if ( (cardsObj.isSplit && !cardsObj.handOneDone) || !cardsObj.isSplit) {
        var card = new Card(randCard());
        cardsObj.userTotal.push(card);
        var total = arrCardCalc(cardsObj.userTotal);
    } else {
        var card = new Card(randCard());
        cardsObj.userTotal2.push(card);
        var total = arrCardCalc(cardsObj.userTotal2);
    }

    // set our new options
    cardsObj.options = ["hit", "stand"];

    //User busted - end game (user loss)
    if (total > 21) {
        var status;
        if (cardsObj.isSplit && !cardsObj.handOneDone) status = `\"${wallet.getNickFromID(user)} Hand One Busted; House Wins, **${wallet.getNickFromID(user)} Loses**\".`
        else if (cardsObj.isSplit && cardsObj.handOneDone) status = `\"${wallet.getNickFromID(user)} Hand Two Busted; House Wins, **${wallet.getNickFromID(user)} Loses**\".`
        else status = `\"${wallet.getNickFromID(user)} Busted; House Wins, **${wallet.getNickFromID(user)} Loses**\".`
        botWin(cardsObj, interaction, status);
    // Users can select another option.
    } else optionSelect(cardsObj, interaction);
}

// Represents a bot turn
function botHit(cardsObj, interaction) {
    var user = interaction.user.id;
    var card = new Card(randCard());
    cardsObj.botTotal.push(card);
    var userTotal = arrCardCalc(cardsObj.userTotal);
    var userTotal2 = arrCardCalc(cardsObj.userTotal2);
    var botTotal = arrCardCalc(cardsObj.botTotal);

    var status = "";

    if (cardsObj.isSplit) status += "Hand 1: ";

    if (botTotal > 21 && userTotal <= 21) {
        //Computer busted - end game (user win)
        status += `\"${appConfig.coinName} Busted; **${wallet.getNickFromID(user)} Wins**\"`;
        botLose(cardsObj, interaction, status);
    }
    // Computer stands
    else if (botTotal >= 17) {
        // Check hand one
        // Computer blackjack
        if (botTotal == 21 && cardsObj.botTotal.length == 2) {
            status += `\"${appConfig.coinName} has Blackjack; House Wins, **${wallet.getNickFromID(user)} Loses**\"`
            botWin(cardsObj, interaction, status);
        }
        else if (userTotal > 21) {
            // Computer has larger number - end game (user loss)
            status += `\"${wallet.getNickFromID(user)} Busted; House Wins, **${wallet.getNickFromID(user)} Loses**\".`;
            botWin(cardsObj, interaction, status);
        }
        else if (botTotal > userTotal) {
            // Computer has larger number - end game (user loss)
            status += `\"${appConfig.coinName} stands with ${botTotal}: House Wins, **${wallet.getNickFromID(user)} Loses**\"`;
            botWin(cardsObj, interaction, status);
        }
        else if (botTotal == userTotal) {
            // It's a tie
            status += `\"${appConfig.coinName} stands with ${botTotal}: **It's a tie**.\"`
            gameDisplay(interaction, cardsObj, status);
            messageMap.delete(user);
            if (cardsObj.isInsured) {
                wallet.subtractPoints(user, bet);
                wallet.addPoints(defaultConfig.botId, bet);
                wallet.updateMessage();
            }
        } else {
            // Computer has smaller number - end game (user win)
            status += `\"${appConfig.coinName} stands with ${botTotal}: **${wallet.getNickFromID(user)} Wins**\"`;
            botLose(cardsObj, interaction, status);
        }

        // Check hand two
        if (cardsObj.isSplit) {
            status += "\nHand 2: ";
            //Computer busted - end game (user win)
            if (botTotal > 21 && userTotal2 <= 21) {
                status += `\"${appConfig.coinName} Busted; **${wallet.getNickFromID(user)} Wins**\"`;
                botLose(cardsObj, interaction, status);
            }
             // Computer blackjack
            else if (botTotal == 21 && cardsObj.botTotal.length == 2) {
                status += `\"${appConfig.coinName} has Blackjack; House Wins, **${wallet.getNickFromID(user)} Loses**\"`
                botWin(cardsObj, interaction, status);
            }
            else if (userTotal2 > 21) {
                // Computer has larger number - end game (user loss)
                status += `\"${wallet.getNickFromID(user)} Busted; House Wins, **${wallet.getNickFromID(user)} Loses**\".`;
                botWin(cardsObj, interaction, status);
            }
            else if (botTotal > userTotal2) {
                // Computer has larger number - end game (user loss)
                status += `\"${appConfig.coinName} stands with ${botTotal}: House Wins, **${wallet.getNickFromID(user)} Loses**\"`;
                botWin(cardsObj, interaction, status);
            }
            else if (botTotal == userTotal2) {
                // It's a tie
                status += `\"${appConfig.coinName} stands with ${botTotal}: **It's a tie**.\"`
                gameDisplay(interaction, cardsObj, status);
                messageMap.delete(user);
            } else {
                // Computer has smaller number - end game (user win)
                status += `\"${appConfig.coinName} stands with ${botTotal}: **${wallet.getNickFromID(user)} Wins**\"`;
                botLose(cardsObj, interaction, status);
            }
        }
    } 
    else {
        // Computer continues hitting
        status = `\"${appConfig.coinName} is thinking...\"`
        gameDisplay(interaction, cardsObj, status);
        setTimeout(() => {
            botHit(cardsObj, interaction);
        }, 1000);
    }
}

function botWin(cardsObj, interaction, reason) {
    var user = interaction.user.id;
    var bet = cardsObj.bet;

    gameDisplay(interaction, cardsObj, reason);

    if (!(cardsObj.isSplit && cardsObj.handOneDone && cardsObj.handTwoDone)) {
        wallet.subtractPoints(user, bet);
        wallet.addPoints(defaultConfig.botId, bet);
        wallet.updateMessage();
    }

    if (cardsObj.isInsured && arrCardCalc(cardsObj.botTotal) == 21 && cardsObj.botTotal.length == 2) {
        wallet.addPoints(user, bet);
        wallet.subtractPoints(defaultConfig.botId, bet);
        wallet.updateMessage();
    } else if (cardsObj.isInsured) {
        wallet.subtractPoints(user, bet);
        wallet.addPoints(defaultConfig.botId, bet);
        wallet.updateMessage();
    }

    if (cardsObj.isSplit && !cardsObj.handOneDone) {
        setTimeout(() => {
            cardsObj.handOneDone = true;
            optionSelect(cardsObj, interaction);
        }, 1000)
    } else if (cardsObj.isSplit && !cardsObj.handTwoDone) {
        setTimeout(() => {
            cardsObj.handTwoDone = true;
            userStand(cardsObj, interaction);
        }, 1000)
    }
    messageMap.delete(user);
}

function botLose(cardsObj, interaction, reason) {
    var user = interaction.user.id;
    var bet = cardsObj.bet;
    wallet.addPoints(user, bet);
    wallet.subtractPoints(defaultConfig.botId, bet);
    wallet.updateMessage();
    gameDisplay(interaction, cardsObj, reason);
    if (cardsObj.isInsured) {
        wallet.subtractPoints(user, bet);
        wallet.addPoints(defaultConfig.botId, bet);
        wallet.updateMessage();
    }

    if (cardsObj.isSplit && !cardsObj.handOneDone) {
        setTimeout(() => {
            cardsObj.handOneDone = true;
            optionSelect(cardsObj, interaction);
        }, 1000)
    } else if (cardsObj.isSplit && !cardsObj.handTwoDone) {
        setTimeout(() => {
            cardsObj.handTwoDone = true;
            userStand(cardsObj, interaction);
        }, 1000)
    }
    
    messageMap.delete(user);
}

// Controls the game display message.
async function gameDisplay(interaction, cardsObj, status) {
    var gamemsg = `Welcome To ${appConfig.coinName} ${jobs.hasJob(interaction.user.id) ? '\'HIGHROLLER\' ' : ''}Blackjack! Get A Higher Total To Earn Your Bet, Or A Total Of 21 For 3:2 Your Bet. \n
                   ${wallet.getNickFromID(interaction.user.id)} Started A New Blackjack Game With ${cardsObj.bet} ${appConfig.coinName}. ${cardsObj.isInsured ? "Insured Against Blackjack!": ""}\n\n`

    var dealerStatus = `${appConfig.coinName}\t Value: ` + arrCardCalc(cardsObj.botTotal) + "\n";
    var dealerCards = "";
    var playerStatus = `${wallet.getNickFromID(interaction.user.id)}\n`;
    var playerCards = "";

    for (i=0;i<cardsObj.botTotal.length;i++) {
        var card = cardsObj.botTotal[i];
        dealerCards += "|" + card.val + " " + card.suite + "| ";
    }
    dealerCards += "\n\n";

    if (cardsObj.isSplit) playerCards += "Hand 1: "

    for (i=0;i<cardsObj.userTotal.length;i++) {
        var card = cardsObj.userTotal[i];
        playerCards += "|" + card.val + " " + card.suite + "| ";
    }

    playerCards += `\t Value: ${arrCardCalc(cardsObj.userTotal)} \n`
    
    if (cardsObj.isSplit) {
        playerCards += "\nHand 2: "
        for (i=0;i<cardsObj.userTotal2.length;i++) {
            var card = cardsObj.userTotal2[i];
            playerCards += "|" + card.val + " " + card.suite + "| ";
        }
        playerCards += `\t Value: ${arrCardCalc(cardsObj.userTotal2)} \n`
    }

    playerCards += "\n";

    if (interaction.replied) interaction.editReply("```ml\n" + gamemsg + dealerStatus + dealerCards + playerStatus + playerCards + status + "```");
    else {
        const message = interaction.reply({ content: "```ml\n" + gamemsg + dealerStatus + dealerCards + playerStatus + playerCards + status + "```", fetchReply: true });
        messageMap.set(interaction.user.id, message);
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