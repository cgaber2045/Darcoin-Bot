/*
  _____              _____      _         __  __            _        _   
 |  __ \            / ____|    (_)       |  \/  |          | |      | |  
 | |  | | __ _ _ __| |     ___  _ _ __   | \  / | __ _ _ __| | _____| |_ 
 | |  | |/ _` | '__| |    / _ \| | '_ \  | |\/| |/ _` | '__| |/ / _ \ __|
 | |__| | (_| | |  | |___| (_) | | | | | | |  | | (_| | |  |   <  __/ |_ 
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |_|  |_|\__,_|_|  |_|\_\___|\__|

 Market module for the DarCoin Bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.
*/

var wallet = require('./wallet');

// Contains all the products that can be bought.
const products = new Map([
  //["shoot", 75],
  //["revive", 50],
  ["kick", 10],
  ["deafen", 15],
  ["undeafen", 10],
  ["gag", 10],
  ["ungag", 5],
  ["taze", 5],
  ["nick", 25]
]);

// Used to store and remove a users roles.
var roleMap = new Map([]);
// Used to store a users nickname if they have one.
var nickMap = new Map([]);

// Used to let the user know how to use the commands.
function help(user) {
  var helpstring = '\n**Market Commands:**\n!buy <product> <name of person> <other...> - Use this command to purchase different products from the marketplace!';
  helpstring += "\n**Products:** " + getProducts();
  if (user) helpstring += '';
  return helpstring;
}

// Function to ban a user (not tested)
function shoot(message, args) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  var user = wallet.getIDFromNick(args[0]);
  var guildMember = guild.member(user);
  if (guildMember != null) {
    if (guildMember.bannable) {
      if (!roleMap.get(guildMember)) roleMap.set(user, guildMember.roles.cache);
      if (!nickMap.get(guildMember)) nickMap.set(user, wallet.getNickFromID(user));
      message.channel.createInvite()
      .then(function(newInvite) {
        /*
        guildMember.send("https://discord.gg/" + newInvite.code);
        guildMember.send("You have been banned by " + wallet.getNickFromID(message.author.id) + ". Type !getroles when you get back.");
        */
        bot.channels.cache.get(defaultConfig.generalChannelID).send(wallet.getNickFromID(message.author.id) + " has banned " + wallet.getNickFromID(user) + ".");
      })
      .then(
        ()=>{ setTimeout(() => { guildMember.ban({ days: 1, reason: 'Someone paid to have you banned. LOL.' }) }, 400); }
      );
      return true;
    } else message.reply("User is not bannable!");
  } else message.reply("User could not be found!");

  return false;
}

// Function to unban a user (not tested)
function revive(message, args) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  var user = wallet.getIDFromNick(args[0]);
    guild.members.unban(user, "Someone paid to have you unbanned... Pogchamp!").then(() => {
      message.channel.createInvite().then(function(newInvite){
        guild.member(user).send("https://discord.gg/" + newInvite.code);
        guild.member(user).send("You have been unbanned by " + wallet.getNickFromID(message.author.id) + ".")
      });
    })
    bot.channels.cache.get(defaultConfig.generalChannelID).send(wallet.getNickFromID(message.author.id) + " has revived " + wallet.getNickFromID(user) + ".");
    return true;
}

// Kick user from server (not tested)
function kick(message, args) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  var user = wallet.getIDFromNick(args[0]);
  var guildMember = guild.member(user);
  if (guildMember != null) {
    if (guildMember.bannable) {
      if (!roleMap.get(guildMember)) roleMap.set(user, guildMember.roles.cache);
      if (!nickMap.get(guildMember)) nickMap.set(user, wallet.getNickFromID(user));
      message.channel.createInvite()
        .then(function(newInvite) {
          guildMember.send("https://discord.gg/" + newInvite.code);
          guildMember.send("You have been kicked by " + wallet.getNickFromID(message.author.id) + ". Use !getroles to get your roles back!");
          bot.channels.cache.get(defaultConfig.generalChannelID).send(wallet.getNickFromID(message.author.id) + " has kicked " + wallet.getNickFromID(user) + ".");
        })
        .then(
          ()=>{ setTimeout(() => { guildMember.kick("Someone paid to have you kicked. LOL.") }, 400); }
        );
      return true;
    } else message.reply("User is not kickable!");
  } else message.reply("User could not be found!");
  return false;
}

// Used to deafen a user
function deafen(message, args) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  var user = wallet.getIDFromNick(args[0]);
  if (guild.member(user) != null) {
    if (guild.member(user).voice.channel) {
      if (guild.member(user).bannable) {
        guild.member(user).voice.setDeaf(true);
        return true;
      } else message.reply("Cannot deafen that person!");
    } else message.reply("User is not in a voice channel!");
  } else message.reply("User could not be found!");
  return false;
}

// Used to undeafen a user
function undeafen(message, args) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  var user = wallet.getIDFromNick(args[0]);
  if (guild.member(user) != null) {
    if (guild.member(user).voice.channel) {
      if (guild.member(user).bannable) {
        guild.member(user).voice.setDeaf(false);
        return true;
      } else message.reply("Cannot undeafen that person!");
    } else message.reply("User is not in a voice channel!");
  } else message.reply("User could not be found!"); 
  return false;
}

// Used to mute a user
function gag(message, args) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  var user = wallet.getIDFromNick(args[0]);
  if (guild.member(user) != null) {
    if (guild.member(user).voice.channel) {
      if (guild.member(user).bannable) {
        guild.member(user).voice.setMute(true);
        return true;
      } else message.reply("Cannot gag that person!");
    } else message.reply("User is not in a voice channel!");
  } else message.reply("User could not be found!");
  return false;
}

// Used to unmute a user
function ungag(message, args) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  var user = wallet.getIDFromNick(args[0]);
  if (guild.member(user) != null) {
    if (guild.member(user).voice.channel) {
      if (guild.member(user).bannable) {
        guild.member(user).voice.setMute(false);
        return true;
      } else message.reply("Cannot ungag that person!");
    } else message.reply("User is not in a voice channel!");
  } else message.reply("User could not be found!");
  return false;
}

// Disconnect user from voice channel
function taze(message, args) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  var user = wallet.getIDFromNick(args[0]);
  if (guild.member(user) != null) {
    if (guild.member(user).voice.channel) {
      if (guild.member(user).bannable) {
        message.guild.members.cache.get(user).voice.kick();
        guild.member(user).send("You have been disconnected by " + wallet.getNickFromID(message.author.id) + ".");
        bot.channels.cache.get(defaultConfig.generalChannelID).send(wallet.getNickFromID(message.author.id) + " has tazed " + wallet.getNickFromID(user) + ".");
        return true;
      } else message.reply("Cannot taze that person!");
    } else message.reply("User is not in a voice channel!");
  } else message.reply("User could not be found!");
  return false;
}

// Used to change a users nick name
function nick(message, args) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  if (args.length > 1) {
    var user = wallet.getIDFromNick(args[0]);
    var name = args[1];
    if (guild.member(user) != null) {
      if (name.length < 32) {
        if (guild.member(user).bannable) {
          if (user != defaultConfig.botId) {
            guild.member(user).setNickname(name);
            guild.member(user).send("You have been named " + name + " by " + wallet.getNickFromID(message.author.id) + ".");
            bot.channels.cache.get(defaultConfig.generalChannelID).send(wallet.getNickFromID(message.author.id) + " has set " + wallet.getNickFromID(user) +"'s name to " + name + ".");
            return true;
          }
        } else message.reply("Cannot rename that person!");
      } else message.reply("Your name is too long!");
    } else message.reply("User could not be found!");
  } else message.reply("Not enough parameters!");
  return false;
}

function getProducts() {
  var productList = "";
  for(const [key,value] of products) if (key != undefined) productList += key + " (" + value + ") ";
  return productList;
}

function buy(message, args) {
  var product = args.shift();
  if (args.length > 0)
    if (products.has(product)) {
      if (wallet.getWallet(message.author.id) >= products.get(product)) {
        if (eval(product)(message, args)) {
          wallet.subtractPoints(message.author.id, products.get(product));
          wallet.addPoints(defaultConfig.botId, products.get(product));
          message.reply("You have purchased " + product + " for " + products.get(product) + " " + appConfig.coinName + "!");
          wallet.updateMessage();
        }
      } else message.reply("You do not have enough to purchase this product!");
    } else message.reply(product + " is not being sold!");
    else message.reply("Wrong arguments - !buy <product> <name of person> <other...> - Use this command to purchase different products from the marketplace!");
}

function getRoles(message) {
  if (roleMap.has(message.author.id)) {
    message.member.roles.add(roleMap.get(message.author.id));
    message.member.setNickname(nickMap.get(message.author.id));
    roleMap.delete(message.author.id);
    nickMap.delete(message.author.id);
  } else message.reply("You were not removed from the server!");
}

module.exports={getProducts, help, buy, shoot, revive, kick, deafen, undeafen, gag, ungag, taze, nick, getRoles}