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
var modules = ["wallet", "betting", "robbing", "market", "blackjack", "music", "jobs"];

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
module.exports = async function commandHandler(message) {
    // Setting up the command catcher.
    if(message.author.bot) return;
    if(message.content.indexOf("!") !== 0) return;

    // Logging what users are using what commands.
    console.log(message.author.username + ": " + message.content);

    // Getting the args as well as the command from the users message.
    var args = message.content.slice(1).trim().match(/(?:[^\s"]+|"[^"]*")+/g);
    const command = args.shift().toLowerCase();

    for (i = 0; i < args.length; i++) {
      if (args[i].charAt(0) === '"' && args[i].charAt(args[i].length-1) === '"') {
        args[i] = args[i].substr(1, args[i].length-2);
      }
    }

    // Checking admin permissions
    var isAdmin = (message.guild != null && (message.member.hasPermission("ADMINISTRATOR") || message.member.roles.cache.some(role => role.name === 'Bot Controller')));

    // Help command
    if (command == "help") {
      if (args.length < 1 || !modules.includes(args[0])) {
        var helpMessage = '**The bot has the following commands:** \
        \n !about - Use this command to get information about the bot! \
        \n For help with specific modules type the name after !help e.x. !help market \
        \n Available modules: ';
        modules.forEach(m => helpMessage += m + " ");
        message.channel.send(helpMessage);
      } else message.channel.send(eval(args[0]).help(isAdmin));
      return;
    }

    // About the bot...
    if (command == "about") {
      message.reply("DarCoin Bot created by CEG for the Sanctuary Discord Server. Current Version: " + pjson.version);
      return;
    }

    // Running the command the user input
    if (isAdmin && adminCommands[command]) {
      adminCommands[command](message, args);
      return;
    } else if (commands[command]) commands[command](message, args);
}