/*
  _____              _____      _              _       _         
 |  __ \            / ____|    (_)            | |     | |        
 | |  | | __ _ _ __| |     ___  _ _ __        | | ___ | |__  ___ 
 | |  | |/ _` | '__| |    / _ \| | '_ \   _   | |/ _ \| '_ \/ __|
 | |__| | (_| | |  | |___| (_) | | | | | | |__| | (_) | |_) \__ \
 |_____/ \__,_|_|   \_____\___/|_|_| |_|  \____/ \___/|_.__/|___/
                                                                 
 Jobs module for the DarCoin bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.                                                          
*/

var wallet = require('./wallet');

// List of all available jobs
var joblist = new Map([
  ["Developer", 25],
  ["Interviewer", 20],
  ["Rapper", 15],
  ["Pro-player", 15],
  ["Celebrity", 15],
  ["Tech Support", 14],
  ["Farmer", 14],
  ["Security", 14],
  ["Hitman", 14],
  ["Baker", 12],
  ["Editor", 12],
  ["Singer", 10],
  ["Actor", 10],
  ["Clown", 10],
  ["Janitor", 8],
  ["Jester", 8],
  ["Memelord", 8],
  ["Prostitute", 6],
  ["Artist", 2]
]);

// Stores roles that are used (we want jobs to be unique).
var takenRoles = new Set();

// Returns help for this module
function help(user) {
  var helpstring = '\n**Job Commands:**\n!listjobs - Use this command to list all available jobs.';
  if (user === "admin") helpstring += '\n!hire <user> <role> - Use this command to hire a user to a role. \
  \n!fire <user> <role> - Use this command to fire a user from a role.';
  return helpstring;
}

function createRoles() {
  // Create any new roles that were added.
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  joblist.forEach((amt, role) => {
    if (!guild.roles.cache.find(x => x.name === role)) {
      guild.roles.create({ name: role, reason: "Creating new role" })
      .then(role => console.log(`Created new role with name ${role.name}`))
      .catch(console.error);
    } 
  });
}

function dailyIncome() {
  var allwallets = wallet.wallet();
  var guild = bot.guilds.cache.get(defaultConfig.serverID);
  // goes through each persons wallet
  allwallets.forEach((amt, userId) => {
    // gets all the person's roles
    var userRoles = guild.members.cache.get(userId).roles.cache;
    userRoles.each((role) => {
      if (joblist.get(role.name)) {
        // Pays people from the bank according to their job, and sets their job as taken.
        takenRoles.add(role.name);
        bot.channels.cache.get(defaultConfig.generalChannelID).send(`${wallet.getNickFromID(userId)} has recieved ${joblist.get(role.name)} ${appConfig.coinName} for being a ${role.name}!\n`)
        wallet.addPoints(userId, joblist.get(role.name));
        wallet.subtractPoints(defaultConfig.botId, joblist.get(role.name));
        wallet.updateMessage();
      }
    })
  })
}

// Lists all available jobs in the server.
function listJobs(message) {
  var jobmsg = "Available Jobs: ";

  joblist.forEach((amt, job) => {
    if (!takenRoles.has( job.charAt(0).toUpperCase() + job.slice(1) )) {
      jobmsg += "**" + job + "** Pay: " + joblist.get(job) + " ";
    }
  });

  message.channel.send(jobmsg);
}

// Used to give a user a role.
function hire(message, user, role) {
  if (wallet.has(user)) {
    if (joblist.get(role.charAt(0).toUpperCase() + role.slice(1))) {
      var member = message.guild.members.cache.get(user);
      var roleId = message.guild.roles.cache.find(x => x.name.toLowerCase() === role.toLowerCase()).id;
      member.roles.add(roleId);
      takenRoles.add(role.charAt(0).toUpperCase() + role.slice(1));
      message.channel.send(`${wallet.getNickFromID(user)} has been hired to be a ${role}!`);
    } else {
      message.channel.send("Job does not exist!");
    }
  } else {
    message.channel.send("User does not have a wallet!");
  }
}

// Removes a role from a user.
function fire(message, user, role) {
  if (wallet.has(user)) {
    if (role && joblist.get(role.charAt(0).toUpperCase() + role.slice(1))) {
      var member = message.guild.members.cache.get(user);
      var roleId = message.guild.roles.cache.find(x => x.name.toLowerCase() === role.toLowerCase()).id;
      member.roles.remove(roleId);
      takenRoles.delete(role.charAt(0).toUpperCase() + role.slice(1));
      message.channel.send(`${wallet.getNickFromID(user)} has been fired from the ${role} job!`);
    } else {
      message.channel.send("Job does not exist!");
    }
  } else {
    message.channel.send("User does not have a wallet!");
  }
}

module.exports = {help, createRoles, dailyIncome, hire, fire, listJobs}