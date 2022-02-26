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
var jobList = new Map();

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
  var incomeMessage = "**Daily Paychecks:**\n";
  // goes through each persons wallet
  allwallets.forEach((amt, userId) => {
    // gets all the person's roles
    try {
      var userRoles = guild.members.cache.get(userId).roles.cache;
      userRoles.each((role) => {
        if (joblist.get(role.name)) {
          // Pays people from the bank according to their job, and sets their job as taken.
          takenRoles.add(role.name);
          jobList.set(userId, role);
          incomeMessage += `> ${wallet.getNickFromID(userId)} has recieved ${joblist.get(role.name)} ${appConfig.coinName} for being a ${role.name}!\n`;
          wallet.addPoints(userId, joblist.get(role.name));
          wallet.subtractPoints(defaultConfig.botId, joblist.get(role.name));
          wallet.updateMessage();
        }
      })
    } catch { console.log("Possibly kicked user found: " + userId); }
  })
  bot.channels.cache.get(defaultConfig.generalChannelID).send(incomeMessage);
}

// Lists all available jobs in the server.
function listJobs(interaction) {
  var jobmsg = "Available Jobs: ";

  joblist.forEach((amt, job) => {
    if (!takenRoles.has( job.charAt(0).toUpperCase() + job.slice(1) )) {
      jobmsg += "**" + job + "**[Pay: " + joblist.get(job) + "] ";
    }
  });

  interaction.reply(jobmsg);
}

// Used to give a user a role.
function hire(interaction, args) {
  if (args.data.length < 2) 
    return interaction.reply("Not enough arguments provided. \n !hire <user> <role> - Use this command to hire a user to a role.");

  var user = args.get('user').value; 
  var role = args.get('role').role;
  
  if (!wallet.has(user)) return interaction.reply("User does not have a wallet!");
  if (!joblist.get(role.name)) return interaction.reply("Job does not exist!");

  var member = interaction.guild.members.cache.get(user);
  member.roles.add(role.id);
  takenRoles.add(role.name);
  jobList.set(user, role.id);
  interaction.reply(`${wallet.getNickFromID(user)} has been hired to be a ${role}!`);
}

// Removes a role from a user.
function fire(interaction, args) {
  if (args.data.length < 2) 
    return interaction.reply("Not enough arguments provided. \n !fire <user> <role> - Use this command to fire a user from a role.");

  var user = args.get('user').value; 
  var role = args.get('role').role;

  if (!wallet.has(user)) return interaction.reply("User does not have a wallet!");
  if (!joblist.get(role.name)) return interaction.reply("Job does not exist!");

  var member = interaction.guild.members.cache.get(user);
  member.roles.remove(role.id);
  takenRoles.delete(role.name);
  jobList.delete(user);
  interaction.reply(`${wallet.getNickFromID(user)} has been fired from the ${role} job!`);
}

function hasJob(userid) {
  return jobList.has(userid);
}

function commands() {
  return [
    {
      "name": "listjobs",
      "description": "Use this command to list all available jobs.",
    },
    {
      "name": "hire",
      "description": "Use this command to hire a user to a role.",
      "options": [
        {
          "type": 6,
          "name": "user",
          "description": "The user to be hired.",
          "required": true
        },
        {
          "type": 8,
          "name": "role",
          "description": "The role to give the user.",
          "required": true
        }
      ]
    },
    {
      "name": "fire",
      "description": "Use this command to fire a user from a role.",
      "options": [
        {
          "type": 6,
          "name": "user",
          "description": "The user to be hired.",
          "required": true
        },
        {
          "type": 8,
          "name": "role",
          "description": "The role to give the user.",
          "required": true
        }
      ]
    },
  ]
}

module.exports = {commands, createRoles, dailyIncome, hire, fire, listJobs, hasJob}