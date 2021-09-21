/*
  _____              _____      _         __  __           _      
 |  __ \            / ____|    (_)       |  \/  |         (_)     
 | |  | | __ _ _ __| |     ___  _ _ __   | \  / |_   _ ___ _  ___ 
 | |  | |/ _` | '__| |    / _ \| | '_ \  | |\/| | | | / __| |/ __|
 | |__| | (_| | |  | |___| (_) | | | | | | |  | | |_| \__ \ | (__ 
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |_|  |_|\__,_|___/_|\___|
                                                                  
 Music module for the DarCoin Bot modified from Gabriel Tanner by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Credit to: https://gabrieltanner.org/blog/dicord-music-bot, underlying logic taken from that project.
*/

// Requires
var wallet = require('./wallet');
const ytdl = require('ytdl-core');
const ytsearch = require('yt-search');
const ffmpeg = require('ffmpeg-static');
const createBar = require("string-progressbar");
const { RichEmbed } = require('discord.js');

// Basic queue to hold the music
var queue = new Map();

// Contains all the products that can be bought.
const products = new Map([
  ["play", 15],
  ["skip", 15]
]);

// Help function for this module
function help(user) {
    var helpstring = `\n**Music Commands:**\n!play <youtube url> - Use this command to play a song for ${products.get("play")} song.length per ${appConfig.coinName}. E.x. a 3 minute vid costs ${180 / products.get("play")}.\
    \n!skip - Use this command to play a song for ${products.get("skip")} ${appConfig.coinName}. \
    \n!queue - Use this command to view all the currently playing songs.`;
    if (user === "admin") helpstring += `\n!adminskip - Use this command to play a song for free.`;
    return helpstring;
}

// Run by user typing !play
async function execute(message, args) {
  // Gets the current voice channel so the bot can join it.
  if (message.guild === null) return message.channel.send("You need to be in a voice channel to play music!");
  const voiceChannel = message.member.voiceChannel;

  // Adds the song queue for this current server.
  const serverQueue = queue.get(message.guild.id);

  if (!voiceChannel) {
    return message.channel.send("You need to be in a voice channel to play music!");
  }

  // Takes in the search the user inputed
  const searchString = Array(args).join(" ");

  // Gets a list of matching songs from the ytsearch api
  const list = await ytsearch(searchString);
  const songInfo = list.videos[0];

  // Stores all the song information
  const song = {
    title: songInfo.title,
    url: songInfo.url,
    length: songInfo.seconds,
    thumbnail: songInfo.thumbnail,
    requester: wallet.getNickFromID(message.author.id),
    cost: Math.ceil(songInfo.seconds / products.get("play")),
    message: null,
    interval: null
  };

  // Checks to see if we have a queue yet
  if (!serverQueue) {
    // Creating the contract for our queue
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    // Setting the queue using our contract
    queue.set(message.guild.id, queueContruct);

    // makes sure you have money to play the song
    if (wallet.getWallet(message.author.id) < song.cost) {
      message.channel.send(`You dont have enough money to play a song!`);
      return;
    } 

    // Charges user for the song
    wallet.addPoints(defaultConfig.botId, song.cost);
    wallet.subtractPoints(message.author.id, song.cost);
    wallet.updateMessage();
    message.channel.send(`${song.requester} has paid ${song.cost} ${appConfig.coinName} to add **${song.title}** to queue.`);
    queue.get(message.guild.id).songs.push(song);

    try {
      // Here we try to join the voicechat and save our connection into our object.
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      // Calling the play function to start a song
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      // Printing the error message if the bot fails to join the voicechat
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }

  } else {

    // makes sure you have money to play the song
    if (wallet.getWallet(message.author.id) < song.cost) {
      message.channel.send(`You dont have enough money to play a song.`);
      return;
    }

    // Charges user for the song
    wallet.addPoints(defaultConfig.botId, song.cost);
    wallet.subtractPoints(message.author.id, song.cost);
    wallet.updateMessage();
    message.channel.send(`${song.requester} has paid ${song.cost} ${appConfig.coinName} to add **${song.title}** to queue.`);
    serverQueue.songs.push(song);
  }
}

// Actually play song
function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  // Out of songs to play
  if (!song) {
    try {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      bot.user.setPresence({ game: {name: appConfig.coinName + " to the Moon!", type:0 } });
    } catch (err) {
      console.log(err);
    }
    
    return;
  }

  // Plays the next song in queue
  const dispatcher = serverQueue.connection.playStream(ytdl(song.url, {filter : 'audioonly', dlChunkSize: 0, highWaterMark: 1<<25,})).on('end', () => {
    console.log("Dispatcher Called!");
    serverQueue.songs.shift();
    play(guild, serverQueue.songs[0]);
  }).on("error", error => console.error(error));

  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

  // Create embed
  sendMessage(serverQueue, dispatcher, song);
  song.interval = setInterval(() => {
    sendMessage(serverQueue, dispatcher, song);
  }, 5000);
  // End embed

  // Sets the bots presence to Now Playing: Song Name
  bot.user.setPresence({ game: {name: song.title, type:0 } });
}

// Used to skip current song for a cost
function skip(message) {
  const serverQueue = queue.get(message.guild.id);

  if (!serverQueue) return message.channel.send("There is no song that I could skip!");

  if (wallet.getWallet(message.author.id) > products.get("skip")) {
      message.channel.send(`${wallet.getNickFromID(message.author.id)} has paid ${products.get("skip")} ${appConfig.coinName} to skip ${serverQueue.songs[0].title}.`);
      wallet.addPoints(defaultConfig.botId, products.get("skip"));
      wallet.subtractPoints(message.author.id, products.get("skip"));
      wallet.updateMessage();
      clearInterval(serverQueue.songs[0].interval);
      serverQueue.connection.dispatcher.end();
  } else {
    message.channel.send(`You cannot afford to skip the song!`);
    return;
  }
}

// Used to skip current song for free for admins
function adminSkip(message) {
  const serverQueue = queue.get(message.guild.id);
  if (!serverQueue) return message.channel.send("There is no song that I could skip!");
  message.channel.send(`${wallet.getNickFromID(message.author.id)} has skipped ${serverQueue.songs[0].title}.`);
  clearInterval(serverQueue.songs[0].interval);
  serverQueue.connection.dispatcher.end();
}

// Prints all the songs in the queue.
function listSongs(message) {
  const serverQueue = queue.get(message.guild.id);

  var songs = "";

  if (!serverQueue || serverQueue.songs.length < 1) {
    songs += "No songs in queue!";
  } else {
    for(var x in serverQueue.songs) {
      if (x == 0) songs += "**Now playing:** " + serverQueue.songs[x].title + "\n**Queue:**\n";
      else songs += x + ") " + serverQueue.songs[x].title + "\n";
    }
  }
  
  message.channel.send(songs);
}

// The display message for the currently playing song
function sendMessage(serverQueue, dispatcher, song) {
  var seek = dispatcher.time / 1000;
  let nowPlaying = new RichEmbed()
  .setTitle(`${appConfig.coinName} Bot - Now playing:`)
  .setDescription(`${song.title}\n\`Requested by: ${song.requester}\``)
  .setColor("#ff0000")
  .setThumbnail(`${song.thumbnail}`)
  .addField(
    "\u200b",
    new Date(seek * 1000).toISOString().substr(14, 5) +
    "[ " +
    createBar.splitBar(song.length == 0 ? seek : song.length, seek, 20)[0] +
    "] " +
    (song.length == 0 ? " ◉ LIVE" : new Date(song.length * 1000).toISOString().substr(14, 5)),
    false
  );

  if (song.length > 0) nowPlaying.setFooter("Time Remaining: " + new Date((song.length - seek) * 1000).toISOString().substr(14, 5));
  if (seek > song.length) clearInterval(interval);

  // Update embed if it exists
  if (!song.message) serverQueue.textChannel.send(nowPlaying).then(sent=>{song.message = sent});
  else song.message.edit(nowPlaying);
}

module.exports = {help, execute, skip, adminSkip, listSongs}