/*
  _____              _____      _         ____       _   _   _              
 |  __ \            / ____|    (_)       |  _ \     | | | | (_)             
 | |  | | __ _ _ __| |     ___  _ _ __   | |_) | ___| |_| |_ _ _ __   __ _  
 | |  | |/ _` | '__| |    / _ \| | '_ \  |  _ < / _ \ __| __| | '_ \ / _` | 
 | |__| | (_| | |  | |___| (_) | | | | | | |_) |  __/ |_| |_| | | | | (_| | 
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |____/ \___|\__|\__|_|_| |_|\__, | 
                                                                      __/ | 
                                                                     |___/  

 Betting module for the DarCoin Bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.
*/

var wallet = require('./wallet');
const createBar = require("string-progressbar");

// Prediction/betting system variables.
var predictionAmounts = new Map(); // Hold the amounts people have bet
var predictionsEnabled = false; // True if there is an ongoing bet
var betStarter = ""; // Holds the name of the person who started the bet
var betMessageId; // The id of the bet message to be updated
var total1 = 0; // Total amount of betting on thing1.
var total2 = 0; // Total amount of bettings on thing2.
var firstBettingThing; // Name of the first betting thing.
var secondBettingThing; // Name of the second betting thing.

function getBetStarter() {
    return betStarter;
}

function help(user) {
  var helpstring = '\n**Betting Commands:**\n!startbets <thing 1> <thing 2> - Use this command to start a prediction. \
  \n!bet <thing> <amt> - Use this command to bet on a thing with your points. \
  \n!stopbets - Use this command to close the betting. \
  \n!winner <thing> - Use this command to declare a winner and distribute winnings.';
  if (user === "admin") helpstring += '\n!cancel - Use this command to cancel any current betting.';
  else helpstring += '\n!cancel - Use this command to cancel your betting.';

  return helpstring;
}

function bet(message, thing, amount) {
    var sender = message.author.id;

    if (predictionsEnabled) {
      if (wallet.has(sender)) {
        if (Number.isInteger(amount)) {
          if (!predictionAmounts.has(sender)) {
            if (firstBettingThing.toLowerCase() === thing.toLowerCase() || secondBettingThing.toLowerCase() === thing.toLowerCase()) {
            // We can successfully bet.
            message.reply("You have bet " + amount + " " + appConfig.coinName + " on " + thing + ".");
            let bet = {thing:thing, amount:amount}
            predictionAmounts.set(sender, bet);
            if (thing.toLowerCase() === firstBettingThing.toLowerCase()) total1 += amount;
            else if (thing.toLowerCase() === secondBettingThing.toLowerCase()) total2 += amount;
            updateBets();
            } else {
              message.reply("The options for the bet are " + firstBettingThing + " and " + secondBettingThing);
            }
          } else {
            message.reply("You have already bet!");
          }
        } else {
          message.reply("You inputed something that was not a whole number.");
        }
      } else {
        message.reply("You must have a coin wallet to bet money!");
      }
    } else {
      message.reply("The betting is closed!");
    }
}

function startBetting(message, first, second) {
    if (!predictionsEnabled || predictionAmounts.size > 0) {
        betStarter = message.author.id;
        predictionsEnabled = true;

        firstBettingThing = first;
        secondBettingThing = second;

        let channel = bot.channels.get(defaultConfig.generalChannelID);

        var message1 = " ".repeat(appConfig.progressBarLength * 1) + "**Betting has started! Who will win?!**\n";
        var message2 = "**" + firstBettingThing + "** " + createBar.filledBar(appConfig.progressBarLength, 0, appConfig.progressBarLength)[0] + " **" + secondBettingThing +"**\n";
        var message3 =  "0.00%" + " ".repeat(appConfig.progressBarLength * 1.2) + "|" + " ".repeat(appConfig.progressBarLength * 1.2) + "0.00%\n";
        var message4 = "**Payout**  __1:" + 0.00 + "__ " + " ".repeat(appConfig.progressBarLength * 1) + " |" + " ".repeat(appConfig.progressBarLength * 1) + "**Payout** __1:" + 0.00 + "__ \n";
        var message5 = " ".repeat(appConfig.progressBarLength * 1) + "Total bet amount: " + (total1 + total2) + " " + appConfig.coinName + "!"; 

        message.reply("Betting has started!");
        channel.send(message1 + message2 + message3 + message4 + message5).then(sent=>{betMessageId = sent.id});
      } else {
        message.reply("There is another bet in progress!");
      }
}

function stopBetting(message) {
    if (predictionsEnabled) {
        let channel = bot.channels.get(defaultConfig.generalChannelID);
        channel.send("Betting has closed!\n");
        message.reply("Betting closed.");
        predictionsEnabled = false;
      } else {
        message.reply("There is no bet in progress!");
      }
}

function winner(message, winner) {
    if (predictionAmounts.size > 0) {
        if (!predictionsEnabled) {
        if (winner.toLowerCase() === firstBettingThing.toLowerCase() || winner.toLowerCase() === secondBettingThing.toLowerCase()) {
          message.reply("Winner declared.");
          var percentOfBets = 0;

          if (winner.toLowerCase() === firstBettingThing.toLowerCase()) {
            percentOfBets = total1 / (total1+total2);
          } else {
            percentOfBets = total2 / (total1+total2);
          }

          payout = (1/percentOfBets) - 1;

          let winners = "";

          for(const [key,value] of predictionAmounts) {
            if (value.thing.toLowerCase() === winner.toLowerCase()) {
              var winningAmt = Math.round(wallet.getWallet(key) + value.amount * payout);
              wallet.setWallet(key, winningAmt);
              winners += "<@"+key+"> (" +  Math.round(value.amount * payout) + ")";
            } else {
              wallet.subtractPoints(key, value.amount);
            }
          }

          let channel = bot.channels.get(defaultConfig.generalChannelID);
          channel.send("The winner was " + winner + "!\n Betters: "+ winners);

          total1 = 0;
          total2 = 0;
          predictionAmounts.clear();
          betStarter = "";
          wallet.updateMessage();

        } else {
          message.reply("Winner is not one of the things! Please enter " + firstBettingThing + " or " + secondBettingThing + ".");
        }
      } else {
        message.reply("You must end predictions to declare a winner!");
      }
    } else {
        message.reply("No people entered in betting!");
    }
    
}

function cancelBets(message) {
    let channel = bot.channels.get(defaultConfig.generalChannelID);
    message.reply("Betting canceled!");
    channel.send("Betting has been canceled!");
    predictionsEnabled = false;
    predictionAmounts.clear();
    total1 = 0;
    total2 = 0;
    betStarter = "";
}

// Used to update the bet message with new bet info.
function updateBets() {
    // Get the channel the bot is attached to.
    let channel = bot.channels.get(defaultConfig.generalChannelID);
  
    // Find the wallet message and then update it with the new information.
    channel.fetchMessage(betMessageId).then(
      message=>{
        odds1 = (total1 / (total1+total2)) * 100;
        odds2 = (total2 / (total1+total2)) * 100;
  
        payout1 = (1 / ( odds1 / 100 ) ) - 1;
        payout2 = (1 / ( odds2 / 100 ) ) - 1;
  
        var message1 = " ".repeat(appConfig.progressBarLength * 1) + "**Betting has started! Who will win?!**\n";
        var message2 = "**" + firstBettingThing + "** " + createBar.filledBar(total1+total2, total1, appConfig.progressBarLength)[0] + " **" + secondBettingThing +"**\n";
        var message3 = odds1.toFixed(2) + "%" + " ".repeat(appConfig.progressBarLength * 1.25) + "|" + " ".repeat(appConfig.progressBarLength * 1.25) + odds2.toFixed(2) + "%\n";
        var message4 = "**Payout** __1:" + payout1.toFixed(2) + "__  " + " ".repeat(appConfig.progressBarLength * 1) + "|" + " ".repeat(appConfig.progressBarLength * 1) + "**Payout** __1:" + payout2.toFixed(2) + "__ \n";
        var message5 = " ".repeat(appConfig.progressBarLength * 1) + "Total bet amount: " + (total1 + total2) + " " + appConfig.coinName + "!"; 
  
        message.edit(message1 + message2 + message3 + message4 + message5);
      }
    );
}

module.exports={getBetStarter,help,bet,startBetting,stopBetting,winner,cancelBets,updateBets}