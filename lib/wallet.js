/*
  _____              _____      _        __          __   _ _      _   
 |  __ \            / ____|    (_)       \ \        / /  | | |    | |  
 | |  | | __ _ _ __| |     ___  _ _ __    \ \  /\  / /_ _| | | ___| |_ 
 | |  | |/ _` | '__| |    / _ \| | '_ \    \ \/  \/ / _` | | |/ _ \ __|
 | |__| | (_| | |  | |___| (_) | | | | |    \  /\  / (_| | | |  __/ |_ 
 |_____/ \__,_|_|   \_____\___/|_|_| |_|     \/  \/ \__,_|_|_|\___|\__|

 Wallet module for the DarCoin bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.
*/

// Map to hold all bank accounts after they are parsed in - resets every 24 hours due to Dyno worker.
var allCoinWallets = new Map();

// Magic function to sort the wallets from greatest to least whenever they are iterated through.
allCoinWallets[Symbol.iterator] = function* () {
  yield* [...this.entries()].sort((a, b) => b[1] - a[1]);
}

// Getters and setters
function addPoints(user, amount) {
  allCoinWallets.set(user, allCoinWallets.get(user) + amount);
}

// Getters and setters
function subtractPoints(user, amount) {
  allCoinWallets.set(user, allCoinWallets.get(user) - amount);
}

// Getters and setters
function setWallet(user, amount) {
    allCoinWallets.set(user, amount);
}

// Getters and setters
function getWallet(user) {
    return allCoinWallets.get(user);
}

function has(user) {
    return allCoinWallets.has(user);
}

function wallet() {
    return allCoinWallets;
}

// Used to create a new wallet.
function create(message) {
    var user = message.user.id;
    if (!allCoinWallets.has(user)) {
        allCoinWallets.set(user, appConfig.initialStartCash);
        updateMessage();
        message.reply("Your wallet has been created! You are starting with " + appConfig.initialStartCash + " " + appConfig.coinName + ".");
      } else {
        message.reply("You already have an existing wallet.");
      }
}

function balance(message) {
  message.reply("You have " + getWallet(message.user.id) + " " + appConfig.coinName + " remaining.");
}

// Used for one user to pay another.
function payUser(message, args) {
  if (args.data.length != 2) {
    message.reply("Not enough arguments provided. \n !pay <user nickname> <amt> - Use this command followed by the nickname of the person and amount to pay them.");
    return;
  }

  var recipient = args.get('user').value;
  var amount = parseInt(args.get('amount').value);
  var sender = message.user.id;
  if (sender != recipient) {
    if (allCoinWallets.has(sender) && allCoinWallets.has(recipient)) {
      if (Number.isInteger(amount)) {
        if (allCoinWallets.get(sender) - amount >= 0 && amount > 0) {
          // We can successfully send money.
          message.reply("You have sent " + amount + " " + appConfig.coinName + " to " + getNickFromID(recipient) + ".");
          bot.users.cache.get(recipient).send("You have recieved " + amount + " " + appConfig.coinName + " from " + getNickFromID(sender) + ".").catch(() => console.log("Can't send DM to your user!"));;
          subtractPoints(sender, amount);
          addPoints(recipient, amount);
          updateMessage();
        } else message.reply("You broke af boy what you doing trying to send money.");
      } else message.reply("You inputed something that was not a whole number.");
    } else message.reply("Both of you must have a coin wallet to send money!");
  } else message.reply("Can't send money to yourself!");
}

// Deletes a users wallet so they can rejoin.
function deleteWallet(message, args) {
    if (args.data.length < 1){
      message.reply("Not enough arguments provided. \n !delete <user nickname> - Use this command to delete a users wallet.");
      return;
    }

    var user = args.get('user').value;

    if (allCoinWallets.has(user)) {
        allCoinWallets.delete(user);
        message.reply("User's wallet has been deleted.");
        updateMessage();
    } else message.reply("User not found!");
}

// Resets the wallet of the specified user to 0.
function resetWallet(message, args) {
    if (args.data.length < 1) {
      message.reply("Not enough arguments provided. \n !reset <user nickname> - Use this command to reset a users wallet.");
      return;
    }

    var user = args.get('user').value;
    if (allCoinWallets.has(user)) {
      allCoinWallets.set(user, 0);
      message.reply("User's wallet has been reset.");
      updateMessage();
    } else message.reply("User not found!");
}

// Used to spawn money into the bank. 
function spawnMoney(message, args) {
    if (args.data.length < 1) {
      message.reply("Not enough arguments provided. \n !spawn <amt> - Use this command to spawn in an amount of money for the bank.");
      return;
    }

    var amount = parseInt(args.get('amount').value);
    var sender = defaultConfig.botId;
    if (Number.isInteger(amount) && amount > 0) {
      // We can successfully send money.
      message.reply(amount + " " + appConfig.coinName + " has been spawned in.");
      addPoints(sender, amount);
      updateMessage();
    } else message.reply("Can't send negative/no money to the bank.");
}

// Used to give people money from the bank.
function giveMoney(message, args) {
    if (args.data.length < 2) {
      message.reply("Not enough arguments provided. \n !give <user nickname> <amt> - Use this command followed by the nickname of the person and amount to pay them.");
      return;
    }

    var recipient = args.get('user').value;
    var amount = parseInt(args.get('amount').value);
    var sender = defaultConfig.botId;

    if (sender != recipient) {
      if (allCoinWallets.has(sender) && allCoinWallets.has(recipient)) {
        if (Number.isInteger(amount) && allCoinWallets.get(sender) - amount >= 0 && amount > 0) {
          message.reply(amount + " " + appConfig.coinName + " has been sent to " + getNickFromID(recipient) + " from the bank.");
          bot.users.cache.get(recipient).send("You have recieved " + amount + " " + appConfig.coinName + " from the bank.");
          subtractPoints(sender, amount);
          addPoints(recipient, amount);
          updateMessage();
        } else {
          message.reply("Not enough money in the bank to send funds.");
        }
      } else {
        message.reply("User not found!");
      }
    } else {
      message.reply("Cannot send money to the bank!");
    }
}

// Function used to give users who have less than 5 DarCoin at restart 5 DarCoin from the bank.
function wellfareSystem() {
    var amt = 0;
    for(const [key,value] of allCoinWallets) {
      if (value < appConfig.wellfareRate && key != defaultConfig.botId && allCoinWallets.get(defaultConfig.botId) > appConfig.wellfareRate) {
        amt += appConfig.wellfareRate;
        addPoints(key, appConfig.wellfareRate);
        subtractPoints(defaultConfig.botId, appConfig.wellfareRate);
      }
    }
    console.log("WELLFARE DISTRIBUTED: " + amt);
    updateMessage();
}

// Function used to tax all players above 20 DarCoin.
function taxSystem() {
  var amt = 0;
  for(const [key,value] of allCoinWallets) {
    if (value > 20 && key != defaultConfig.botId) {
      var amount = Math.round(allCoinWallets.get(key)*appConfig.taxRate);
      amt += amount;
      subtractPoints(key, amount);
      addPoints(defaultConfig.botId, amount);
    }
  }
  console.log("TAXES COLLECTED: " + amt);
  updateMessage();
}

// Used to update the bots message with the new wallet info.
function updateMessage() {
    // Get the channel the bot is attached to.
    let channel = bot.channels.cache.get(defaultConfig.walletChannelID);
  
    // Find the wallet message and then update it with the new information.
    channel.messages.fetch(databaseMessage).then(
      message=>{
        var newMessage = "**__Wallets__ - Please DM me (the bot) /help to get the commands.**\n";
        newMessage += appConfig.announcement;
        for(const [key,value] of allCoinWallets) {
          newMessage += `<@${key}> - ${value} ${appConfig.coinName} - Items: ${formatItems(key)}\n`;
        }
  
        message.edit(newMessage);
      }
    );
}

// Used to turn a discord ID into a nickname.
function getNickFromID(id) {
    // Get the cache of all users.
    var guild = bot.guilds.cache.get(defaultConfig.serverID);
    var userArray = guild.members.cache;
    // Get the users information.
    var currentUser = userArray.find(user => user.user.id === id);
    try {
      if (currentUser && currentUser.nickname === undefined || currentUser.nickname === null) return currentUser.user.username;
      else if (currentUser) return currentUser.nickname;
      else return "";
    } catch {
      console.log("User not found - possibly banned: " + id);
    }
}

// Used to turn a nickname into a discord ID.
function getIDFromNick(nick) {
  // Get the cache of all servers.
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  var userArray = guild.members.cache;
  
  var currentUser = userArray.find(user => (user.user.username + "#" + user.user.discriminator).toLowerCase() === nick.toLowerCase() || 
  (user.nickname && ( user.nickname.toLowerCase() === nick.toLowerCase()) ) || 
  (user.user.username && ( user.user.username.toLowerCase() === nick.toLowerCase())));
  if (currentUser) return currentUser.id;
  else return -1;
}

/*
  _____              _____      _         _____ _                     
 |  __ \            / ____|    (_)       |_   _| |                    
 | |  | | __ _ _ __| |     ___  _ _ __     | | | |_ ___ _ __ ___  ___ 
 | |  | |/ _` | '__| |    / _ \| | '_ \    | | | __/ _ \ '_ ` _ \/ __|
 | |__| | (_| | |  | |___| (_) | | | | |  _| |_| ||  __/ | | | | \__ \
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |_____|\__\___|_| |_| |_|___/
                                                                      
 Items module for the DarCoin bot created by Chris Gaber.
*/

// Contains all the products that can be bought.
const products = new Map([
  //["gun", "Lower's robbing chance.", 5], 
  ["dongle", ["Used to hack the bank!", 5]], 
  //["shield", "Protection from one item.", 5],
]);

// Map to hold all items after they are parsed in - resets every 24 hours due to Dyno worker.
var allUserItems = new Map();

// Getters and setters
function addItem(user, item) {
  if (!allUserItems.get(user)) allUserItems.set(user, []);
  allUserItems.get(user).push(item);
  updateMessage();
}

// Getters and setters
function removeItem(user, item) {
  var items = allUserItems.get(user); 
  allUserItems.set(user, items.filter(i => i!==item));
  updateMessage();
}

// Getters and setters
function getItems(user) {
  if (!allUserItems.get(user)) allUserItems.set(user, []);
  return allUserItems.get(user);
}

function addItems(user, itemList) {
  for(const item of itemList) addItem(user, item);
}

function hasItem(user, item) {
  if (!allUserItems.get(user)) allUserItems.set(user, []);
  return allUserItems.get(user).includes(item);
}

function allItems() {
  return allUserItems;
}

function formatItems(user) {
  if (allUserItems.get(user) && allUserItems.get(user).length > 0) return `["${allUserItems.get(user).join('", "')}"]`;
  else return "[]";
}

function items(interaction, args) {
  var product = args.get('product').value;
  if (products.has(product)) {
      if (getWallet(interaction.user.id) >= products.get(product)[1]) {
          subtractPoints(interaction.user.id, products.get(product)[1]);
          addPoints(defaultConfig.botId, products.get(product)[1]);
          interaction.reply("You have purchased " + product + " for " + products.get(product)[1] + " " + appConfig.coinName + "!");
          updateMessage();
          addItem(interaction.user.id, product);
      } else interaction.reply("You do not have enough to purchase this product!");
  } else interaction.reply(product + " is not being sold!");
}

function getProducts() {
  var productList = [];
  for( let [key, value] of products ) productList.push({"name": `${key} (${value[1]} ${appConfig.coinName}) - ${value[0]}`, "value": key});
  return productList;
}

function commands() {
  return [
    {
      "name": "items",
      "description": "Use this command to purchase different items from the item store!",
      "options": [
        {
          "type": 3,
          "name": "product",
          "description": "The product to purchase.",
          "required": true,
          "choices": getProducts()
        }
      ]
    },
    {
      "name": "pay",
      "description": `Use this command to pay a person.`,
      "options": [
        {
          "type": 6,
          "name": "user",
          "description": "The user to pay.",
          "required": true
        },
        {
          "type": 4,
          "name": "amount",
          "description": "The amount to give them.",
          "required": true
        }
      ]
    },
    {
      "name": "join",
      "description": `Use this command to create a wallet for the first time.`
    },
    {
      "name": "balance",
      "description": `Use this command to get your current balance!`
    },
    {
      "name": "give",
      "description": `Use this command to give a person money from the bank.`,
      "options": [
        {
          "type": 6,
          "name": "user",
          "description": "The user to pay.",
          "required": true
        },
        {
          "type": 4,
          "name": "amount",
          "description": "The amount to give them.",
          "required": true
        }
      ]
    },
    {
      "name": "reset",
      "description": `Use this command to reset a persons wallet.`,
      "options": [
        {
          "type": 6,
          "name": "user",
          "description": "The user to reset.",
          "required": true
        }
      ]
    },
    {
      "name": "delete",
      "description": `Use this command to delete a persons wallet.`,
      "options": [
        {
          "type": 6,
          "name": "user",
          "description": "The user to delete.",
          "required": true
        }
      ]
    },
    {
      "name": "spawn",
      "description": `Use this command to spawn money for the bank.`,
      "options": [
        {
          "type": 4,
          "name": "amount",
          "description": "The amount to give the bank.",
          "required": true
        }
      ]
    }
  ]
}

module.exports = {commands, addPoints, subtractPoints, setWallet, getWallet, balance, 
                  has, create, wallet, payUser, deleteWallet, resetWallet, spawnMoney, 
                  giveMoney, wellfareSystem, taxSystem, updateMessage, getNickFromID, getIDFromNick, 
                  items, addItem, addItems, removeItem, getItems, hasItem, allItems, formatItems};