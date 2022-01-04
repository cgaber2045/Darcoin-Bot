/*
  _____              _____      _         _    _            _    _             
 |  __ \            / ____|    (_)       | |  | |          | |  (_)            
 | |  | | __ _ _ __| |     ___  _ _ __   | |__| | __ _  ___| | ___ _ __   __ _ 
 | |  | |/ _` | '__| |    / _ \| | '_ \  |  __  |/ _` |/ __| |/ / | '_ \ / _` |
 | |__| | (_| | |  | |___| (_) | | | | | | |  | | (_| | (__|   <| | | | | (_| |
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |_|  |_|\__,_|\___|_|\_\_|_| |_|\__, |
                                                                          __/ |
                                                                         |___/ 

 Hacking module for the DarCoin bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.
*/

var wallet = require('./wallet');
const crypto = require("crypto");
const generator  = require('generate-maze');

// Set to hold cooldowns of people who hacked - resets every cooldown.
var hackCooldowns = new Map();

// Main game loop.
function hackingGame(interaction, args) {
  if (!interaction.channel) {
      interaction.reply(`Hacking currently not supported in DM's!`);
      return;
  }

  var date = new Date();
  if (date.getDay() != 6 || date.getDay() != 3) {
    interaction.reply(`Hacking is only available on Wednesday and Saturday!`);
    return;
  }

  var sender = interaction.user.id;
  //var recipient = args.get('user').value;
  //var amount = parseInt(args.get('amount').value);

  // We need to determine how difficult to make the game
  //var difficultyRating = Math.round(15.1818*((amount/wallet.getWallet(recipient)) + 500) - 7590.86);
  var difficultyRating = 12;

  var width, height;
  width = ((recipient == defaultConfig.botId) ? 12 : 8) + difficultyRating;
  height = 10;

  var startPos = {x: crypto.randomInt(0, Math.round(width/4)), y: crypto.randomInt(0, height)};
  var endPos = {x: crypto.randomInt(Math.round(3*width/4), width), y: crypto.randomInt(0, height)};

  // Creating our maze object
  var gameObject = {
    board: generator(width, height, true, crypto.randomInt(0, 123456)),
    start: startPos,
    end: endPos,
    currentPos: {...startPos},
    path: [],
    timelimit: 30, // time to solve in seconds
    user: defaultConfig.botId, //recipient,
    message: null,
    amount: 50,
    finished: false,
  }

  // Put person on cooldown
  if (!hackCooldowns.has(sender) || !(hackCooldowns.get(sender) >= Date.now())) {
      // Checking if both parties have wallets
      if (wallet.has(sender) && wallet.has(recipient)) {
          // Checking amount input
          if (Number.isInteger(amount)) {
              // Checking that they have the entry fee
              if (wallet.getWallet(sender) - (Math.round(amount * appConfig.penaltyAmount)) >= 0) {
                  // Checking that they are only trying to hack what they have
                  if (wallet.getWallet(recipient) - amount >= 0 && amount > 0) {
                    hackCooldowns.set(sender, Date.now() + (appConfig.robCooldown*60*60*1000));
                    gameDisplay(interaction, gameObject);
                  } else interaction.reply("You can't take more than what they have LOL.");
              } else interaction.reply("You must have at least " + appConfig.penaltyAmount * 100 + "% of the amount you are trying to hack in case you fail.");
          } else interaction.reply("You inputed something that was not a whole number.");
      } else interaction.reply("Both of you must have a coin wallet to attempt to hack money!");
  } else {
      var d = new Date(hackCooldowns.get(sender));
      interaction.reply("Relax buddy, you just tried to hack someone! You are on a hacking cooldown until " + d.toLocaleString('en-US', { month:'numeric', day:'numeric', hour:'numeric', minute: 'numeric', hour12: true}) + " EST.");
  }
}

// Converts the maze object into a viewable maze.
function printMaze(interaction, gameObject) {
  var board = gameObject.board; // 2d array of cell objects
  let stringRepresentation = '';
  var spaceChar = '⬜';
  var wallChar = '⬛';
  var pathChar = '🟩';
  var startChar = '🔷';
  var playerChar = '💢';
  var endChar = '🔶';
  
  // creating the top of our maze
  for (let topRow = 0; topRow < board[0].length * 2 + 1; topRow++) {
    stringRepresentation += wallChar;
  }
  stringRepresentation += '\n';

  // create the rest of the maze
  for (let row = 0; row < board.length; row++) {
    let rowString = '';
    let nextRowString = '';
    for (let cell = 0; cell < board[row].length; cell++) {
      // if we are in the first column we want there to be a wall
      if (cell === 0 && board[row][cell].left) {
        rowString += wallChar;
        nextRowString += wallChar;
      }

      // The current cell is a free space or an object.
      if (cell == gameObject.start.x && row == gameObject.start.y) rowString += startChar;
      else if (cell == gameObject.end.x && row == gameObject.end.y) rowString += endChar;
      else if (cell == gameObject.currentPos.x && row == gameObject.currentPos.y) rowString += playerChar;
      else if (gameObject.path.some(pos => (pos.x == cell && pos.y == row))) rowString += pathChar;
      else rowString += spaceChar;
      
      // If we can move right it is a space otherwise it is a wall.
      rowString += board[row][cell].right ? wallChar : 
        gameObject.path.some(pos => (pos.x == cell && pos.y == row)) 
        && gameObject.path.some(pos => (row == pos.y && cell == pos.x - 1)) ? pathChar : spaceChar; 

      // If we can move down it is a space otherwise it is a wall.
      nextRowString += board[row][cell].bottom ? wallChar : 
        gameObject.path.some(pos => (pos.x == cell && pos.y == row))
        && gameObject.path.some(pos => (cell == pos.x && row == pos.y - 1)) ? pathChar : spaceChar; 
  
      nextRowString += wallChar;
    }
    rowString += '\n' + nextRowString;
    stringRepresentation += row + 1 < board.length ? rowString + '\n' : rowString;
  }
  stringRepresentation += '\n';
  return stringRepresentation;
}

function gameDisplay(interaction, gameObject) {
  var amount = gameObject.amount;
  var sender = interaction.user.id;
  var recipient = interaction.options.get('user').value;
  var displayString = "@ DarCoin Lite Extraction OS - Kernel Version 1.11.0-34-generic x86_64\n";
  if (!interaction.replied) {
    interaction.reply({ content: "```py\n" + displayString + "```", fetchReply: true }).then(message => gameObject.message = message);
    setTimeout( () => {
      displayString += "@ Starting IP cracker tool...\n";
      interaction.editReply("```py\n" + displayString + "```");
      setTimeout( () => {
        displayString += `@ Target found: ${wallet.getNickFromID(gameObject.user)}, cracking IP address...\n`;
        interaction.editReply("```py\n" + displayString + "```");
        setTimeout( () => {
          var ip = (Math.floor(Math.random() * 255) + 1)+"."+(Math.floor(Math.random() * 255))+"."+(Math.floor(Math.random() * 255))+"."+(Math.floor(Math.random() * 255));
          displayString += `@ Success! IP Found: ${ip}\n`;
          interaction.editReply("```py\n" + displayString + "```");
          setTimeout( () => {
            displayString += "@ Beginning manual tunneling protocol... (3)\n";
            interaction.editReply("```py\n" + displayString + "```");  
            setTimeout( () => {
              displayString += "@ Beginning manual tunneling protocol... (2)\n";
              interaction.editReply("```py\n" + displayString + "```");       
              setTimeout( () => {
                displayString += "@ Beginning manual tunneling protocol... (1)\n";
                interaction.editReply("```py\n" + displayString + "```");
                setTimeout( () => {
                  gameDisplay(interaction, gameObject);
                  setupControls(interaction, gameObject);
                }, 1000);
              }, 1000);
            }, 1000);
          }, 2000);
        }, 2000);
      }, 2000)
    }, 2000);
  } else {
    displayString += `# Manual Tunneling Protocol v1.2.0\n`;
    displayString += `${" ".repeat(10)} 'Hacking User: ${wallet.getNickFromID(gameObject.user)}' ${" ".repeat(20)} 'Time Remaining Before Alarm: ${gameObject.timelimit} seconds'\n`;
    displayString += printMaze(interaction, gameObject);
    if (!gameObject.finished && gameObject.currentPos.x == gameObject.end.x && gameObject.currentPos.y == gameObject.end.y) {
      displayString += `\'${wallet.getNickFromID(sender)} has successfully completed the hack!\'\n`;
      displayString += `\'${wallet.getNickFromID(sender)} has earned ${amount} ${appConfig.coinName}!\'\n`;
      wallet.addPoints(sender, amount);
      wallet.subtractPoints(recipient, amount);
      wallet.updateMessage();
      gameObject.finished = true;
    } else if (!gameObject.finished && gameObject.timelimit <= 0) {
      displayString += `\'${wallet.getNickFromID(sender)} has failed the hack!\'\n`;
      displayString += `\'${wallet.getNickFromID(sender)} has lost ${Math.round(amount * appConfig.penaltyAmount)} ${appConfig.coinName}!\'\n`;
      wallet.subtractPoints(sender, Math.round(amount * appConfig.penaltyAmount));
      wallet.addPoints(recipient, Math.round(amount * appConfig.penaltyAmount));
      wallet.updateMessage();
      gameObject.finished = true;
    } else displayString += '\'Use the arrows below to connect the nodes.\'';
    interaction.editReply("```py\n" + displayString + "```");
  }
}

function setupControls(interaction, gameObject) {
  var upReact = "⬆️";
  var downReact = "⬇️";
  var leftReact = "⬅️";
  var rightReact = "➡️";

  gameObject.message.react(upReact)
    .then(() => gameObject.message.react(downReact))
    .then(() => gameObject.message.react(leftReact))
    .then(() => gameObject.message.react(rightReact))
    .then(()=>{
        const filter = (reaction, user) => {
            return [upReact, downReact, leftReact, rightReact].includes(reaction.emoji.name) && user.id === interaction.user.id;
        };
      
        const collector = gameObject.message.createReactionCollector({ filter, time: gameObject.timelimit * 1000});
        gameObject.path.push({...gameObject.start});
      
        setInterval(() => {
          gameObject.timelimit-=1;
        }, 1000);
      
        collector.on('collect', (reaction, user) => {
          if (reaction.emoji.name === upReact) {
            if (!gameObject.board[gameObject.currentPos.y][gameObject.currentPos.x].top) {
              gameObject.currentPos.y -= 1;
              gameObject.path.push({...gameObject.currentPos});
              gameDisplay(interaction, gameObject);
            }
          } else if (reaction.emoji.name === downReact) {
            if (!gameObject.board[gameObject.currentPos.y][gameObject.currentPos.x].bottom) {
              gameObject.currentPos.y += 1;
              gameObject.path.push({...gameObject.currentPos});
              gameDisplay(interaction, gameObject);
            }
          } else if (reaction.emoji.name === leftReact) {
            if (!gameObject.board[gameObject.currentPos.y][gameObject.currentPos.x].left) {
              gameObject.currentPos.x -= 1;
              gameObject.path.push({...gameObject.currentPos});
              gameDisplay(interaction, gameObject);
            }
          } else if (reaction.emoji.name === rightReact) {
            if (!gameObject.board[gameObject.currentPos.y][gameObject.currentPos.x].right) {
              gameObject.currentPos.x += 1;
              gameObject.path.push({...gameObject.currentPos});
              gameDisplay(interaction, gameObject);
            }
          }
      
          reaction.users.remove(user.id);
        });
      
        collector.on('end', collected => {
          gameObject.timelimit = 0;
          gameDisplay(interaction, gameObject);
          gameObject.message.reactions.removeAll()
            .catch(error => console.error('Failed to clear reactions:', error));
        });
    })
}

function hack(interaction, args) {    
    hackingGame(interaction, args);
}

function commands() {
    return [
      {
        "name": "hack",
        "description": `Hack a person for an amount of their points. Failure costs ${appConfig.penaltyAmount * 100}% of what you tried to take.`,
      }
    ]
}

/*
        "options": [
          {
            "type": 6,
            "name": "user",
            "description": "The user to attempt to hack.",
            "required": true
          },
          {
            "type": 4,
            "name": "amount",
            "description": "The amount to try to take.",
            "required": true
          }
        ]
*/

module.exports = {commands, hack}