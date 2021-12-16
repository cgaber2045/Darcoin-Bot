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

var allBets = new Map(); // Holds all ongoing bets from different servers.

function help(user) {
  var helpstring = '\n**Betting Commands:**\n!startbets <object 1> <object 2> - Use this command to start a prediction. \
  \n!bet <object> <amount> - Use this command to bet on an object with your points. \
  \n!stopbets - Use this command to close the betting. \
  \n!winner <object> - Use this command to declare a winner and distribute winnings.';
  if (user) helpstring += '\n!cancel - Use this command to cancel any current betting.';
  else helpstring += '\n!cancel - Use this command to cancel your betting.';

  return helpstring;
}

// Used to bet on an object.
function bet(message, args) {
  if (args.length != 2) {
    message.reply("Not enough arguments provided. \n !bet <object> <amount> - Use this command to bet on an object with your points.");
    return;
  }

  var bet = allBets.get(message.guild.id);
  var object = args[0];
  var amount = parseInt(args[1]);
  var sender = message.author.id;

  if (bet && bet.predictionsEnabled) {
    if (wallet.has(sender)) {
      if (Number.isInteger(amount)) {
        if (!bet.predictionAmounts.has(sender)) {
          if (bet.objectOne.toLowerCase() === object.toLowerCase() || bet.objectTwo.toLowerCase() === object.toLowerCase()) {
            // We can successfully bet.
            message.reply("You have bet " + amount + " " + appConfig.coinName + " on " + object + ".");
            bet.predictionAmounts.set(sender, {object:object, amount:amount});
            if (object.toLowerCase() === bet.objectOne.toLowerCase()) bet.totalBetOne += amount;
            else bet.totalBetTwo += amount;
            updateBets(bet);
          } else message.reply("The options for the bet are " + bet.objectOne + " and " + bet.objectTwo);
        } else message.reply("You have already bet!");
      } else message.reply("You inputed something that was not a whole number.");
    } else message.reply("You must have a coin wallet to bet money!");
  } else message.reply("The bettings are closed!");
}

// FUnction used to start betting.
function startBetting(message, args) {
  if (args.length < 2) { 
    message.reply("Not enough arguments provided. \n !startbets <object one> <object two> - Use this command to start a prediction.");
    return;
  }

  if (!allBets.get(message.guild.id)) {
    // Creating a new bet
    var bet = {
      betCreator: "", // Holds the name of the person who started the bet
      betMessageId: "", // The id of the bet message to be updated
      totalBetOne: 0, // Total amount of betting on first object.
      totalBetTwo: 0, // Total amount of bettings on second object.
      objectOne: "", // Name of the first betting object.
      objectTwo: "", // Name of the second betting object.
      predictionAmounts: new Map(), // Hold the amounts people have bet
      predictionsEnabled: false, // True if there is an ongoing bet
    } 
    allBets.set(message.guild.id, bet);
  } else var bet = allBets.get(message.guild.id);

  if (!bet.predictionsEnabled || bet.predictionAmounts.size > 0) {
    bet.betCreator = message.author.id;
    bet.predictionsEnabled = true;
    bet.objectOne = args[0];
    bet.objectTwo = args[1];
    updateBets(bet);
  } else message.reply("There is another bet in progress!");
}

// Function used to close betting
function stopBetting(message) {
  var bet = allBets.get(message.guild.id);
  if (!bet || message.author.id != bet.betCreator) return;

  if (bet.predictionsEnabled) {
    let channel = bot.channels.cache.get(defaultConfig.generalChannelID);
    channel.send("Betting has closed!\n");
    bet.predictionsEnabled = false;
  } else message.reply("There is no bet in progress!");
}

// Function used to declare a winner
function winner(message, args) {
  if (args.length < 1) {
    message.reply("Not enough arguments provided. \n !winner <object> - Use this command to declare a winner and distribute winnings.");
    return;
  }

  var bet = allBets.get(message.guild.id);
  if (!bet || message.author.id != bet.betCreator) return;

  var winner = args[0];

  if (bet.predictionAmounts.size > 0) {
      if (!bet.predictionsEnabled) {
        if (winner.toLowerCase() === bet.objectOne.toLowerCase() || winner.toLowerCase() === bet.objectTwo.toLowerCase()) {
          bettingPercent = (winner.toLowerCase() === bet.objectOne.toLowerCase()) ? 
              bet.totalBetOne / (bet.totalBetOne + bet.totalBetTwo) : 
              bet.totalBetTwo / (bet.totalBetOne + bet.totalBetTwo);
          payout = (1 / bettingPercent) - 1;
          let winners = "";
          for(const [key,value] of bet.predictionAmounts) {
            if (value.object.toLowerCase() === winner.toLowerCase()) {
              amountWon = Math.round(wallet.getWallet(key) + value.amount * payout);
              wallet.setWallet(key, amountWon);
              winners += `<@${key}> (${Math.round(value.amount * payout)} ${appConfig.coinName})`;
            } else wallet.subtractPoints(key, value.amount);
          }

          let channel = bot.channels.cache.get(defaultConfig.generalChannelID);
          channel.send("The winner was " + winner + "!\n Betters: "+ winners);
          allBets.delete(message.guild.id);
          wallet.updateMessage();
        } else message.reply("Winner is not one of the objects! Please enter " + bet.objectOne + " or " + bet.objectTwo + ".");
      } else message.reply("You must end predictions to declare a winner!");
    } else message.reply("No people entered in betting!");
}

// Function used to cancel betting.
function cancelBets(message) {
  var bet = allBets.get(message.guild.id);
  var isAdmin = (message.guild != null && (message.member.hasPermission("ADMINISTRATOR") 
                || message.member.roles.cache.some(role => role.name === 'Bot Controller')));
      
  if (!bet || !(isAdmin || message.author.id == bet.betCreator) ) return;
  let channel = bot.channels.cache.get(defaultConfig.generalChannelID);
  message.reply("Betting canceled!");
  channel.send("Betting has been canceled!");
  allBets.delete(message.guild.id);
}

// Used to update the bet message with new bet info.
function updateBets(bet) {
  // Get the channel the bot is attached to.
  let channel = bot.channels.cache.get(defaultConfig.generalChannelID);

  if (bet.betMessageId == "") {
    betmessage = " ".repeat(appConfig.progressBarLength * 1) + "**Betting has started! Who will win?!**\n";
    betmessage += "**" + bet.objectOne + "** " + createBar.filledBar(appConfig.progressBarLength, 0, appConfig.progressBarLength)[0] + " **" + bet.objectTwo +"**\n";
    betmessage +=  "0.00%" + " ".repeat(appConfig.progressBarLength * 1.2) + "|" + " ".repeat(appConfig.progressBarLength * 1.2) + "0.00%\n";
    betmessage += "**Payout**  __1:" + 0.00 + "__ " + " ".repeat(appConfig.progressBarLength * 1) + " |" + " ".repeat(appConfig.progressBarLength * 1) + "**Payout** __1:" + 0.00 + "__ \n";
    betmessage += " ".repeat(appConfig.progressBarLength * 1) + "Total bet amount: " + (bet.totalBetOne + bet.totalBetTwo) + " " + appConfig.coinName + "!"; 
    channel.send(betmessage).then(sent => { bet.betMessageId = sent.id } );
  } else {
    // Find the betting message and then update it with the new information.
    channel.messages.fetch(bet.betMessageId).then(
      message=>{
        objectOneOdds = (bet.totalBetOne / (bet.totalBetOne + bet.totalBetTwo)) * 100;
        objectTwoOdds = (bet.totalBetTwo / (bet.totalBetOne + bet.totalBetTwo)) * 100;

        payout1 = (1 / ( objectOneOdds / 100 ) ) - 1;
        payout2 = (1 / ( objectTwoOdds / 100 ) ) - 1;

        betmessage = " ".repeat(appConfig.progressBarLength * 1) + "**Betting has started! Who will win?!**\n";
        betmessage += "**" + bet.objectOne + "** " + createBar.filledBar(bet.totalBetOne + bet.totalBetTwo, bet.totalBetOne, appConfig.progressBarLength)[0] + " **" + bet.objectTwo +"**\n";
        betmessage += objectOneOdds.toFixed(2) + "%" + " ".repeat(appConfig.progressBarLength * 1.25) + "|" + " ".repeat(appConfig.progressBarLength * 1.25) + objectTwoOdds.toFixed(2) + "%\n";
        betmessage += "**Payout** __1:" + payout1.toFixed(2) + "__  " + " ".repeat(appConfig.progressBarLength * 1) + "|" + " ".repeat(appConfig.progressBarLength * 1) + "**Payout** __1:" + payout2.toFixed(2) + "__ \n";
        betmessage += " ".repeat(appConfig.progressBarLength * 1) + "Total bet amount: " + (bet.totalBetOne + bet.totalBetTwo) + " " + appConfig.coinName + "!"; 

        message.edit(betmessage);
      }
    );
  }
}

module.exports={help, bet, startBetting, stopBetting, winner, cancelBets}