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

// Used to bet on an object.
function bet(interaction, args) {
  if (args.data.length != 2) {
    interaction.reply("Not enough arguments provided. \n !bet <object> <amount> - Use this command to bet on an object with your points.");
    return;
  }

  var bet = allBets.get(interaction.guild.id);
  var object = args.get('object').value;
  var amount = args.get('amount').value;
  var sender = interaction.user.id;

  if (bet && bet.predictionsEnabled) {
    if (wallet.has(sender)) {
      if (Number.isInteger(amount)) {
        if (!bet.predictionAmounts.has(sender)) {
          if (bet.objectOne.toLowerCase() === object.toLowerCase() || bet.objectTwo.toLowerCase() === object.toLowerCase()) {
            // We can successfully bet.
            interaction.reply("You have bet " + amount + " " + appConfig.coinName + " on " + object + ".");
            bet.predictionAmounts.set(sender, {object:object, amount:amount});
            if (object.toLowerCase() === bet.objectOne.toLowerCase()) bet.totalBetOne += amount;
            else bet.totalBetTwo += amount;
            updateBets(bet);
          } else interaction.reply("The options for the bet are " + bet.objectOne + " and " + bet.objectTwo);
        } else interaction.reply("You have already bet!");
      } else interaction.reply("You inputed something that was not a whole number.");
    } else interaction.reply("You must have a coin wallet to bet money!");
  } else interaction.reply("The bettings are closed!");
}

// FUnction used to start betting.
function startBetting(interaction, args) {
  if (args.data.length < 2) { 
    interaction.reply("Not enough arguments provided. \n !startbets <object one> <object two> - Use this command to start a prediction.");
    return;
  }

  if (!allBets.get(interaction.guild.id)) {
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
    allBets.set(interaction.guild.id, bet);
  } else var bet = allBets.get(interaction.guild.id);

  if (!bet.predictionsEnabled || bet.predictionAmounts.size > 0) {
    bet.betCreator = interaction.user.id;
    bet.predictionsEnabled = true;
    bet.objectOne = args.get('object1').value;
    bet.objectTwo = args.get('object2').value;
    updateBets(bet);
    interaction.reply({ content: 'Betting has started!', ephemeral: true });
  } else interaction.reply({ content: "There is another bet in progress!", ephemeral: true });
}

// Function used to close betting
function stopBetting(interaction) {
  var bet = allBets.get(interaction.guild.id);
  if (!bet || interaction.user.id != bet.betCreator) return;

  if (bet.predictionsEnabled) {
    let channel = bot.channels.cache.get(defaultConfig.generalChannelID);
    interaction.reply({ content: 'Betting has closed!', ephemeral: true });
    channel.send("Betting has closed!\n");
    bet.predictionsEnabled = false;
  } else interaction.reply({ content: 'There is no bet in progress!', ephemeral: true });
}

// Function used to declare a winner
function winner(interaction, args) {
  if (args.data.length < 1) {
    interaction.reply("Not enough arguments provided. \n !winner <object> - Use this command to declare a winner and distribute winnings.");
    return;
  }

  var bet = allBets.get(interaction.guild.id);
  if (!bet || interaction.user.id != bet.betCreator) return;

  var winner = args.get('object').value;

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
          allBets.delete(interaction.guild.id);
          wallet.updateMessage();
          interaction.reply({ content: 'Winner declared!', ephemeral: true });
        } else interaction.reply("Winner is not one of the objects! Please enter " + bet.objectOne + " or " + bet.objectTwo + ".");
      } else interaction.reply("You must end predictions to declare a winner!");
    } else interaction.reply("No people entered in betting!");
}

// Function used to cancel betting.
function cancelBets(interaction) {
  var bet = allBets.get(interaction.guild.id);
  var isAdmin = (interaction.guild != null && (interaction.member.permissions.has("ADMINISTRATOR") 
                || interaction.member.roles.cache.some(role => role.name === 'Bot Controller')));
      
  if (!bet || !(isAdmin || interaction.user.id == bet.betCreator) ) return;
  let channel = bot.channels.cache.get(defaultConfig.generalChannelID);
  interaction.reply({ content: 'Betting has been canceled!', ephemeral: true });
  channel.send("Betting has been canceled!");
  allBets.delete(interaction.guild.id);
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
      interaction=>{
        objectOneOdds = (bet.totalBetOne / (bet.totalBetOne + bet.totalBetTwo)) * 100;
        objectTwoOdds = (bet.totalBetTwo / (bet.totalBetOne + bet.totalBetTwo)) * 100;

        payout1 = (1 / ( objectOneOdds / 100 ) ) - 1;
        payout2 = (1 / ( objectTwoOdds / 100 ) ) - 1;

        betmessage = " ".repeat(appConfig.progressBarLength * 1) + "**Betting has started! Who will win?!**\n";
        betmessage += "**" + bet.objectOne + "** " + createBar.filledBar(bet.totalBetOne + bet.totalBetTwo, bet.totalBetOne, appConfig.progressBarLength)[0] + " **" + bet.objectTwo +"**\n";
        betmessage += objectOneOdds.toFixed(2) + "%" + " ".repeat(appConfig.progressBarLength * 1.25) + "|" + " ".repeat(appConfig.progressBarLength * 1.25) + objectTwoOdds.toFixed(2) + "%\n";
        betmessage += "**Payout** __1:" + payout1.toFixed(2) + "__  " + " ".repeat(appConfig.progressBarLength * 1) + "|" + " ".repeat(appConfig.progressBarLength * 1) + "**Payout** __1:" + payout2.toFixed(2) + "__ \n";
        betmessage += " ".repeat(appConfig.progressBarLength * 1) + "Total bet amount: " + (bet.totalBetOne + bet.totalBetTwo) + " " + appConfig.coinName + "!"; 

        interaction.edit(betmessage);
      }
    );
  }
}

function commands() {
  return [
    {
      "name": "bet",
      "description": "Use this command to bet on an object with your points. ",
      "options": [
        {
          "type": 3,
          "name": "object",
          "description": "An object to bet on.",
          "required": true
        },
        {
          "type": 4,
          "name": "amount",
          "description": "Amount to bet with.",
          "required": true
        }
      ]
    },
    {
      "name": "startbets",
      "description": "Use this command to start a prediction.",
      "options": [
        {
          "type": 3,
          "name": "object1",
          "description": "An object to bet on.",
          "required": true
        },
        {
          "type": 3,
          "name": "object2",
          "description": "An object to bet on.",
          "required": true
        }
      ]
    },
    {
      "name": "stopbets",
      "description": "Use this command to close the betting.",
    },
    {
      "name": "winner",
      "description": "Use this command to declare a winner and distribute winnings.",
      "options": [
        {
          "type": 3,
          "name": "object",
          "description": "Object that won the bet!",
          "required": true
        },
      ]
    },
    {
      "name": "cancel",
      "description": "Use this command to cancel the current betting.",
    },
  ]
}

module.exports={commands, bet, startBetting, stopBetting, winner, cancelBets}