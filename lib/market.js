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
  ["timeout", 15], // per minute
  ["kick", 10],
  ["deafen", 15],
  ["undeafen", 10],
  ["gag", 10],
  ["ungag", 5],
  ["taze", 3],
  ["nick", 25],
]);

// Used to store and remove a users roles.
var roleMap = new Map([]);
// Used to store a users nickname if they have one.
var nickMap = new Map([]);

// Function to timeout a user
function timeout(interaction, args) {
  var userMember = args.get('user').member;
  var time = 1;
  if (!!args.get('optional')) time = parseInt(args.get('optional').value);
  if (userMember != null) {
    if (userMember.bannable) {
      userMember.timeout(time * 60 * 1000, `${interaction.user.id} paid to shut them up.`)
      .catch(console.error);
      return true;
    } else interaction.reply("User is not timeoutable!");
  } else interaction.reply("User could not be found!");
  return false;
}

// Kick user from server
function kick(interaction, args) {
  var user = args.get('user').value;
  var userMember = args.get('user').member;
  if (userMember != null) {
    if (userMember.bannable) {
      if (!roleMap.get(userMember)) roleMap.set(user, userMember.roles.cache);
      if (!nickMap.get(userMember)) nickMap.set(user, wallet.getNickFromID(user));
      interaction.channel.createInvite()
        .then(function(newInvite) {
          try {
            userMember.send("https://discord.gg/" + newInvite.code);
            userMember.send("You have been kicked by " + wallet.getNickFromID(interaction.user.id) + ". Use /getroles to get your roles back!");
            bot.channels.cache.get(defaultConfig.generalChannelID).send(wallet.getNickFromID(interaction.user.id) + " has kicked " + wallet.getNickFromID(user) + ".");
          } catch {
            console.log("Can't send messages to this user!")
          }
        })
        .then(
          ()=>{ setTimeout(() => { userMember.kick("Someone paid to have you kicked. LOL.") }, 400); }
        );
      return true;
    } else interaction.reply("User is not kickable!");
  } else interaction.reply("User could not be found!");
  return false;
}

// Used to deafen a user
function deafen(interaction, args) {
  var userMember = args.get('user').member;
  if (userMember != null) {
    if (userMember.voice.channel) {
      if (userMember.bannable) {
        userMember.voice.setDeaf(true);
        return true;
      } else interaction.reply("Cannot deafen that person!");
    } else interaction.reply("User is not in a voice channel!");
  } else interaction.reply("User could not be found!");
  return false;
}

// Used to undeafen a user
function undeafen(interaction, args) {
  var userMember = args.get('user').member;
  if (userMember != null) {
    if (userMember.voice.channel) {
      if (userMember.bannable) {
        userMember.voice.setDeaf(false);
        return true;
      } else interaction.reply("Cannot undeafen that person!");
    } else interaction.reply("User is not in a voice channel!");
  } else interaction.reply("User could not be found!"); 
  return false;
}

// Used to mute a user
function gag(interaction, args) {
  var userMember = args.get('user').member;
  if (userMember != null) {
    if (userMember.voice.channel) {
      if (userMember.bannable) {
        userMember.voice.setMute(true);
        return true;
      } else interaction.reply("Cannot gag that person!");
    } else interaction.reply("User is not in a voice channel!");
  } else interaction.reply("User could not be found!");
  return false;
}

// Used to unmute a user
function ungag(interaction, args) {
  var userMember = args.get('user').member;
  if (userMember != null) {
    if (userMember.voice.channel) {
      if (userMember.bannable) {
        userMember.voice.setMute(false);
        return true;
      } else interaction.reply("Cannot ungag that person!");
    } else interaction.reply("User is not in a voice channel!");
  } else interaction.reply("User could not be found!");
  return false;
}

// Disconnect user from voice channel
function taze(interaction, args) {
  var user = args.get('user').value;
  var userMember = args.get('user').member;
  if (userMember != null) {
    if (userMember.voice.channel) {
      if (userMember.bannable) {
        try {
          userMember.voice.kick();
          userMember.send("You have been disconnected by " + wallet.getNickFromID(interaction.user.id) + ".");
          bot.channels.cache.get(defaultConfig.generalChannelID).send(wallet.getNickFromID(interaction.user.id) + " has tazed " + wallet.getNickFromID(user) + ".");
          return true;
        } catch {
          console.log("Can't send messages to this user!")
        }
      } else interaction.reply("Cannot taze that person!");
    } else interaction.reply("User is not in a voice channel!");
  } else interaction.reply("User could not be found!");
  return false;
}

// Used to change a users nick name
function nick(interaction, args) {
  if (args.get('optional')) {
    var user = args.get('user').value;
    var name = args.get('optional').value;
    var userMember = args.get('user').member;

    if (userMember != null) {
      if (name.length < 32) {
        if (userMember.bannable) {
          if (user != defaultConfig.botId) {
            try {
              userMember.setNickname(name);
              userMember.send("You have been named " + name + " by " + wallet.getNickFromID(interaction.user.id) + ".");
              bot.channels.cache.get(defaultConfig.generalChannelID).send(wallet.getNickFromID(interaction.user.id) + " has set " + wallet.getNickFromID(user) +"'s name to " + name + ".");
              return true;
            } catch {
              console.log("Can't send messages to this user!")
            }
          }
        } else interaction.reply("Cannot rename that person!");
      } else interaction.reply("Your name is too long!");
    } else interaction.reply("User could not be found!");
  } else interaction.reply("You need to provide the nickname as the optional data!");
  return false;
}

function getProducts() {
  var productList = [];
  for(const [key,value] of products) if (key != undefined) productList.push({"name": `${key} (${value} ${appConfig.coinName})`, "value": key});
  return productList;
}

function buy(interaction, args) {
  var product = args.get('product').value;
  if (args.data.length == 0) 
    return interaction.reply("Wrong arguments - !buy <product> <name of person> <other...> - Use this command to purchase different products from the marketplace!");
  if (!products.has(product)) return interaction.reply(product + " is not being sold!");
  if (wallet.getWallet(interaction.user.id) < products.get(product)) return interaction.reply("You do not have enough to purchase this product!");

  if (eval(product)(interaction, args)) {
    if (product == "timeout") {
      var time = 1;
      if (!!args.get('optional')) time = parseInt(args.get('optional').value);
      wallet.payPoints(interaction.user.id, defaultConfig.botId, products.get(product) * time);
      interaction.reply("You have purchased " + product + " for " + products.get(product) * time + " " + appConfig.coinName + "!");
    } else {
      wallet.payPoints(interaction.user.id, defaultConfig.botId, products.get(product));
      interaction.reply("You have purchased " + product + " for " + products.get(product) + " " + appConfig.coinName + "!");
    }
  }
}

function getRoles(interaction) {
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  if (roleMap.has(interaction.user.id)) {
    guild.members.cache.get(interaction.user.id).roles.add(roleMap.get(interaction.user.id));
    guild.members.cache.get(interaction.user.id).setNickname(nickMap.get(interaction.user.id));
    roleMap.delete(interaction.user.id);
    nickMap.delete(interaction.user.id);
    interaction.reply("Added roles back!");
  } else interaction.reply("You were not removed from the server!");
}

function commands() {
  return [
    {
      "name": "buy",
      "description": "Use this command to purchase different products from the marketplace!",
      "options": [
        {
          "type": 3,
          "name": "product",
          "description": "The product to purchase.",
          "required": true,
          "choices": getProducts()
        },
        {
          "type": 6,
          "name": "user",
          "description": "The user to use the product on.",
          "required": true
        },
        {
          "type": 3,
          "name": "optional",
          "description": "Any optional arguments required for the specific item.",
          "required": false
        }
      ]
    },
    {
      "name": "getroles",
      "description": "Use this command to get roles back after being kicked!"
    }
  ]
}

module.exports={commands, buy, getRoles}