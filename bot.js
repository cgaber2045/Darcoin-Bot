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

// See for API reference: https://discord.js.org/#/docs/main/13.3.1/general/welcome
const {Client, Intents} = require('discord.js');

// Module inclusions
const wallet = require('./lib/wallet');
const jobs = require('./lib/jobs');
const commandHandler = require("./commands");

// Importing and setting different configs for the bot
require('dotenv').config();
global.pjson = require('./package.json');
global.config = require('./config');
global.defaultConfig = process.env.CONFIG == "production" ? config.production : config.testing;
global.appConfig = config.app;
global.cookieString = process.env.COOKIE_STRING;

// Message with all the data.
global.databaseMessage = "";

// Initialize Discord Bot
global.bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_BANS, 
  Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Intents.FLAGS.GUILD_INTEGRATIONS, Intents.FLAGS.GUILD_WEBHOOKS, 
  Intents.FLAGS.GUILD_INVITES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MESSAGES, 
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.DIRECT_MESSAGES]});

// Bot login
bot.login(process.env.BOT_TOKEN);
bot.once("ready", initializeBot);
bot.on("interactionCreate", commandHandler);

let bankAccountText = "**__Wallets__ - Do / to see all the possible commands!**\n";
    bankAccountText += appConfig.announcement;

// Needed everytime the bot comes online to make sure all of our data is preserved.
function initializeBot() {
  console.log(`Bot has started, with ${bot.users.cache.size} users, in ${bot.channels.cache.size} channels of ${bot.guilds.cache.size} guilds.`);
  bot.user.setPresence({ activities: [{name: appConfig.coinName + " to the Moon!", type:"COMPETING" }] });
  global.defaultConfig.botId = bot.user.id;

  // update bot cache
  bot.guilds.cache.get(defaultConfig.serverID).members.fetch();

  let channel = bot.channels.cache.get(defaultConfig.walletChannelID);
  channel.messages.fetch({ limit: 100 }).then(messages => {
    // Iterate through the messages and see if the bot already made a message. 
    // If not, we know this is the first run of the bot.
    message = messages.find(message => (message.author.id == defaultConfig.botId && message.content.length > bankAccountText.length));
    // If this is not the bots first run
    if (message) {
      databaseMessage = message.id;
      return refreshMessageArray();
    }
    // We see if we should import any wallets.
    return parseMessages();
  })
}

// Get all of Server Admin's messages in the channel and store them in a way the bot can understand.
function parseMessages() {
  let channel = bot.channels.cache.get(defaultConfig.walletChannelID);

  channel.messages.fetch({ limit: 100 }).then(messages => {
    messages.forEach(message => {if(message.member.permissions.has("ADMINISTRATOR")){
      var content = message.content;
      var splitMessage = content.split(" - ");
      var name = wallet.getIDFromNick(splitMessage[0]);
      var amount = splitMessage[1];
      if (name != 0) wallet.setWallet(name, parseInt(amount));
    } })

    // The bot starts with a finite amount of money and serves as the bank.
    wallet.setWallet(defaultConfig.botId, appConfig.initialBankCash);
    for(const [key,value] of wallet.wallet()) {
      bankAccountText += `<@${key}> - ${value} ${appConfig.coinName} - Items: ${wallet.formatItems(key)}\n`;
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
        var amount = parseInt(splitMessage[1].replace(appConfig.coinName, ''));
        try {
          var itemlist = JSON.parse(splitMessage[2].substring(6));
        } catch  {var itemlist = [];}

        if (Number.isNaN(amount)) amount = 0;
        if (id != 0) {
          wallet.setWallet(id, amount);
          wallet.addItems(id, itemlist);
        }
      }
    }
  ).then( () => {
      // Stuff to do after the bot is initialized.
      jobs.createRoles();
      wallet.taxSystem();
      wallet.wellfareSystem();
      jobs.dailyIncome();
  });
}