/*
   _____                                          _     
  / ____|                                        | |    
 | |     ___  _ __ ___  _ __ ___   __ _ _ __   __| |___ 
 | |    / _ \| '_ ` _ \| '_ ` _ \ / _` | '_ \ / _` / __|
 | |___| (_) | | | | | | | | | | | (_| | | | | (_| \__ \
  \_____\___/|_| |_| |_|_| |_| |_|\__,_|_| |_|\__,_|___/

 Command handler for the DarCoin Bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.
*/

// Module inclusions
var wallet = require('./lib/wallet');
var betting = require('./lib/betting');
var robbing = require('./lib/robbing');
var market = require('./lib/market');
var blackjack = require('./lib/blackjack');
var music = require('./lib/music');
var jobs = require('./lib/jobs');

// All avaiable normal permission commands
var commands = {
  balance: wallet.balance,
  join: wallet.create,
  pay: wallet.payUser,
  rob: robbing.rob,
  buy: market.buy,
  getroles: market.getRoles,
  blackjack: blackjack.startGame,
  play: music.execute,
  skip: music.skip,
  queue: music.listSongs,
  listjobs: jobs.listJobs,
  bet: betting.bet,
  startbets: betting.startBetting,
  stopbets: betting.stopBetting,
  winner: betting.winner,
  cancel: betting.cancelBets
}

// All avaiable admin permission commands
var adminCommands = {
  delete: wallet.deleteWallet,
  reset: wallet.resetWallet,
  spawn: wallet.spawnMoney,
  give: wallet.giveMoney,
  adminskip: music.adminSkip,
  hire: jobs.hire,
  fire: jobs.fire
}

// Setting up the command catcher.
module.exports = async function commandHandler(interaction) {
    // Setting up the command catcher.
    if (!interaction.isCommand()) return;

    // Logging what users are using what commands.
    console.log(interaction.user.username + ": " + interaction.commandName);

    console.log(interaction.options);

    // Getting the args as well as the command from the user.
    var args = interaction.options ? interaction.options : null;

    // Checking admin permissions
    var isAdmin = (interaction.guild != null && (interaction.member.permissions.has("ADMINISTRATOR") || interaction.member.roles.cache.some(role => role.name === 'Bot Controller')));

    // About the bot...
    if (interaction.commandName == "about") {
      interaction.reply("DarCoin Bot created by CEG for the Sanctuary Discord Server. Current Version: " + pjson.version);
      return;
    }

    // Running the command the user input
    if (isAdmin && adminCommands[interaction.commandName]) {
      adminCommands[interaction.commandName](interaction, args);
      return;
    } else if (commands[interaction.commandName]) commands[interaction.commandName](interaction, args);
    else interaction.reply({ content: "You do not have access to that command!", ephemeral: true });
}