/*
  _____              _____      _         ____        _   
 |  __ \            / ____|    (_)       |  _ \      | |  
 | |  | | __ _ _ __| |     ___  _ _ __   | |_) | ___ | |_ 
 | |  | |/ _` | '__| |    / _ \| | '_ \  |  _ < / _ \| __|
 | |__| | (_| | |  | |___| (_) | | | | | | |_) | (_) | |_ 
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |____/ \___/ \__|

 DarCoin Discord Bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.
*/

// See for API reference: https://discord.js.org/#/docs/main/11.6.4/general/welcome
const {Client, Intents} = require('discord.js');

// Module inclusions
var wallet = require('./lib/wallet');
var jobs = require('./lib/jobs');
const commandHandler = require("./commands");
require('dotenv').config();
global.pjson = require('./package.json');
global.config = require('./config');

// Setting different configs for the bot
if (process.env.CONFIG == "production") global.defaultConfig = config.production;
else global.defaultConfig = config.testing;
global.appConfig = config.app;

// Message with all the data.
global.databaseMessage = "";

// Initialize Discord Bot
global.bot = new Client({ intents: [Intents.FLAGS.GUILDS] });

// Bot login
bot.login(process.env.BOT_TOKEN);
bot.once("ready", initializeBot);
bot.on("message", commandHandler);

// Needed everytime the bot comes online to make sure all of our data is preserved.
function initializeBot() {
  console.log(`Bot has started, with ${bot.users.cache.size} users, in ${bot.channels.cache.size} channels of ${bot.guilds.cache.size} guilds.`);
  bot.user.setPresence({ activity: {name: appConfig.coinName + " to the Moon!", type:"PLAYING" } });
  global.defaultConfig.botId = bot.user.id;

  // update bot cache
  bot.guilds.cache.get(defaultConfig.serverID).members.fetch()

  var firstMessage = true;
  let channel = bot.channels.cache.get(defaultConfig.walletChannelID);
  channel.messages.fetch({ limit: 100 }).then(messages => {
    // Iterate through the messages and see if the bot already made a message. If not, we know this 
    // is the first run of the bot.
    messages.forEach(message => {
      if(message.author.id === defaultConfig.botId) {
        firstMessage = false; 
        databaseMessage = message.id;
      } 
    })
  }).then(
    () => {
      // If this is the first run, we want to get the server admin's messages and store all of the data
      // in a way the bot can understand it.
      if (firstMessage === true) parseMessages();
      else refreshMessageArray();
    })
}

// Get all of Server Admin's messages in the channel and store them in a way the bot can understand.
function parseMessages() {
  let channel = bot.channels.cache.get(defaultConfig.walletChannelID);

  channel.messages.fetch({ limit: 100 }).then(messages => {
    messages.forEach(message => {if(message.member.hasPermission("ADMINISTRATOR")){
      var content = message.content;
      var splitMessage = content.split(" - ");

      var name = wallet.getIDFromNick(splitMessage[0]);
      var amt = splitMessage[1];

      if (name != 0) wallet.setWallet(name, parseInt(amt));
    } })

    // The bot starts with a finite amount of money and serves as the bank.
    wallet.setWallet(defaultConfig.botId, appConfig.initialBankCash);

    let bankAccountText = "**__Wallets__ - Please DM me (the bot) !help to get the commands.**\n";
    bankAccountText += appConfig.announcement;
    for(const [key,value] of wallet.wallet()) {
      bankAccountText += "<@" + key +">" + " - " + value + " - " + appConfig.coinName + "\n";
    }

    channel.send(bankAccountText);
  });
}

// Use the bots message to update our built in storage.
function refreshMessageArray() {
  // Get the channel the bot is attached to.
  let channel = bot.channels.cache.get(defaultConfig.walletChannelID);

  // Get the original wallets message and use it to set up the built in memory.
  channel.messages.fetch(databaseMessage).then(
    message => {
      // Seperate the parts of the message.
      var messages = message.content.split("\n");

      // Update each users wallets.
      for (i = 2; i < messages.length; i++) {
        var splitMessage = messages[i].split(" - ");
        var id = splitMessage[0].replace(/[<>@]/g, '');
        var amt = parseInt(splitMessage[1]);

        if (amt === NaN) amt = 0;
        if (id != 0) wallet.setWallet(id, amt);
      }
    }
    ).then( () => {
      jobs.createRoles();
      wallet.taxSystem();
      jobs.dailyIncome();
      wallet.wellfareSystem();
    });
}