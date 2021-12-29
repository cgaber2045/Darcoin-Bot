/*
  _____              _____      _         _____       _     _     _             
 |  __ \            / ____|    (_)       |  __ \     | |   | |   (_)            
 | |  | | __ _ _ __| |     ___  _ _ __   | |__) |___ | |__ | |__  _ _ __   __ _ 
 | |  | |/ _` | '__| |    / _ \| | '_ \  |  _  // _ \| '_ \| '_ \| | '_ \ / _` |
 | |__| | (_| | |  | |___| (_) | | | | | | | \ \ (_) | |_) | |_) | | | | | (_| |
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |_|  \_\___/|_.__/|_.__/|_|_| |_|\__, |
                                                                           __/ |
                                                                          |___/ 

 Robbing module for the DarCoin bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.
*/

var wallet = require('./wallet');
const crypto = require("crypto");

// Set to hold cooldowns of people who robbed - resets every cooldown.
var robCooldowns = new Map();

function rob(message, args) {
    if (args.data.length < 2) {
        message.reply("Not enough arguments provided. \
      \n !rob <user nickname> <amt> - Use this command to rob a person for an amount of their points (The more you rob, the lower the odds of success and greater punishment). \
      The punishment is " + (appConfig.penaltyAmount * 100) + "% of what you tried to rob.");
      return;
    }
    
    var recipient = args.get('user').value;
    var amount = parseInt(args.get('amount').value);
    var sender = message.user.id;

    // Put person on cooldown
    if (!robCooldowns.has(sender) || !(robCooldowns.get(sender) >= Date.now())) {

        // Checking if both parties have wallets
        if (wallet.has(sender) && wallet.has(recipient)) {

            // Checking amount input
            if (Number.isInteger(amount)) {

                // Checking that they have the entry fee
                if (wallet.getWallet(sender) - (Math.round(amount * appConfig.penaltyAmount)) >= 0) {

                    // Checking that they are only trying to rob what they have
                    if (wallet.getWallet(recipient) - amount >= 0 && amount > 0) {
                        robCooldowns.set(sender, Date.now() + (appConfig.robCooldown*60*60*1000));

                        var probability = function(n) {
                            return !!n && crypto.randomInt(0, 1000000) <= n;
                        };
                        
                        // Equation to calculate how likely to rob a certain amount of a users money. y = -0.761322x^(1/2) + 0.76895, where y is the success chance and x is the percentage of a persons wealth.
                        var successrate = -0.761322*Math.pow( (amount/wallet.getWallet(recipient) ), 0.5) + 0.76895;
                        var date = new Date();

                        if (recipient == defaultConfig.botId && (date.getDay() === 6 || date.getDay() === 3)) successrate /= 1.15;
                        else if (recipient == defaultConfig.botId) successrate /= 6;

                        var success = probability(successrate * 1000000);
                        
                        if (success) {
                            // We have successfully robbed the person.
                            //bot.users.cache.get(recipient).send("You have been robbed for " + amount + " " + appConfig.coinName + " by " + wallet.getNickFromID(sender) + ".").catch(() => console.log("Can't send DM to your user!"));;
                            wallet.addPoints(sender, amount);
                            wallet.subtractPoints(recipient, amount);
                            bot.channels.cache.get(defaultConfig.generalChannelID).send("<@" + sender + "> has sucessfully robbed <@" + recipient + "> for " + amount + " " + appConfig.coinName +"! (Odds: " + (successrate * 100).toFixed(3) + "%)");
                            wallet.updateMessage();
                        } else {
                            // We have failed the rob attempt at the person.
                            message.reply("You have failed to rob " + amount + " " + appConfig.coinName + " from " + wallet.getNickFromID(recipient) + ". You lost " + Math.round(amount * appConfig.penaltyAmount) + " " + appConfig.coinName +"!");
                            //bot.users.cache.get(recipient).send("You have defended against being robbed for " + amount + " " + appConfig.coinName + " by " + wallet.getNickFromID(sender) + ". You gained " + Math.round(amount * appConfig.penaltyAmount) + " " + appConfig.coinName +"!").catch(() => console.log("Can't send DM to your user!"));;
                            wallet.subtractPoints(sender, Math.round(amount * appConfig.penaltyAmount));
                            wallet.addPoints(recipient, Math.round(amount * appConfig.penaltyAmount));
                            bot.channels.cache.get(defaultConfig.generalChannelID).send("<@" + sender + "> has failed to rob <@" + recipient + "> for " + amount + " " + appConfig.coinName +"! They lost " + Math.round(amount * appConfig.penaltyAmount) + " " + appConfig.coinName + "! (Odds: " + (successrate * 100).toFixed(3) + "%)");
                            wallet.updateMessage();
                        }
                      } else message.reply("You can't take more than what they have.");
                    } else message.reply("You must have at least " + appConfig.penaltyAmount * 100 + "% of the amount you are trying to rob in case you fail.");
                } else message.reply("You inputed something that was not a whole number.");
            } else message.reply("Both of you must have a coin wallet to attempt to rob money!");
        } else {
            var d = new Date(robCooldowns.get(sender));
            message.reply("Relax buddy, you just tried to rob someone! You are on a robbing cooldown until " + d.toLocaleString('en-US', { month:'numeric', day:'numeric', hour:'numeric', minute: 'numeric', hour12: true}) + " EST.");
        }
}

function commands() {
    return [
      {
        "name": "rob",
        "description": `Rob a person for an amount of their points. Failure costs ${appConfig.penaltyAmount * 100}% of what you tried to rob.`,
        "options": [
          {
            "type": 6,
            "name": "user",
            "description": "The user to attempt to rob.",
            "required": true
          },
          {
            "type": 4,
            "name": "amount",
            "description": "The amount to try to take.",
            "required": true
          }
        ]
      }
    ]
  }

module.exports = {commands, rob}