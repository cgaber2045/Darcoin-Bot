/*
  _____              _____      _         __  __           _      
 |  __ \            / ____|    (_)       |  \/  |         (_)     
 | |  | | __ _ _ __| |     ___  _ _ __   | \  / |_   _ ___ _  ___ 
 | |  | |/ _` | '__| |    / _ \| | '_ \  | |\/| | | | / __| |/ __|
 | |__| | (_| | |  | |___| (_) | | | | | | |  | | |_| \__ \ | (__ 
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |_|  |_|\__,_|___/_|\___|
                                                                  
 Music module for the DarCoin Bot modified from Gabriel Tanner by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Credit to: https://gabrieltanner.org/blog/dicord-music-bot, some logic taken from that project.
*/

// Requires
var wallet = require('./wallet');
const ytdl = require('ytdl-core');
const ytsearch = require('yt-search');
const createBar = require("string-progressbar");
const { MessageEmbed } = require('discord.js');

// Basic queue to hold the music
var queue = new Map();

// Checking if youtube url
function matchYoutubeUrl(url) {
  var p = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  if(url.match(p)) return url.match(p)[1];
  return false;
}

// Help function for this module
function help(user) {
    var helpstring = `\n**Music Commands:**\n!play <youtube url> - Use this command to play a song for ${appConfig.playCost} song.length per ${appConfig.coinName}. E.x. a 3 minute vid costs ${180 / appConfig.playCost}.\
    \n!skip - Use this command to play a song for ${appConfig.skipCost} ${appConfig.coinName}. \
    \n!queue - Use this command to view all the currently playing songs.`;
    if (user) helpstring += `\n!adminskip - Use this command to play a song for free.`;
    return helpstring;
}

// Run by user typing !play
async function execute(message, args) {
  if (args.length < 1) {
    message.reply(`Not enough arguments provided. \n !play <youtube url> - Use this command to play a song for 8 seconds per ${appConfig.coinName}. E.x. a 3 minute vid costs 23 ${appConfig.coinName}.`);
    return;
  }

  // Gets the current voice channel so the bot can join it.
  if (message.guild === null) return message.channel.send("You need to be in a voice channel to play music!");
  const voiceChannel = message.member.voice.channel;

  // Adds the song queue for this current server.
  const serverQueue = queue.get(message.guild.id);

  if (!voiceChannel) {
    return message.channel.send("You need to be in a voice channel to play music!");
  }

  // Takes in the search the user inputed
  const searchString = args.join(' ');

  var songInfo;

  // Gets a list of matching songs from the ytsearch api
  if (matchYoutubeUrl(searchString)) {
    // If we are given a URL, just play it.
    songInfo = await ytdl.getInfo(searchString);
    songInfo.title = songInfo.videoDetails.title;
    songInfo.url = songInfo.videoDetails.video_url;
    songInfo.seconds = songInfo.videoDetails.lengthSeconds;
    songInfo.thumbnail = songInfo.videoDetails.thumbnails[0].url;
  } else {
    // Else search for it.
    const list = await ytsearch(searchString);
    songInfo = list.videos[0];
  }
  

  if (!songInfo) return;
  
  // Stores all the song information
  const song = {
    title: songInfo.title,
    url: songInfo.url,
    length: songInfo.seconds,
    thumbnail: songInfo.thumbnail,
    requester: message.author.id,
    cost: Math.ceil(songInfo.seconds / appConfig.playCost),
    message: null,
    interval: null
  };

  // Checks to see if we have a queue yet
  if (!serverQueue) {
    // Creating the construct for our queue
    const queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    // Setting the queue using our construct
    queue.set(message.guild.id, queueConstruct);

    // makes sure you have money to play the song
    if (wallet.getWallet(message.author.id) < song.cost) {
      message.channel.send(`You don't have enough money to play a song!`);
      return;
    } 

    // Added song to queue
    message.channel.send(`${wallet.getNickFromID(song.requester)} has added **${song.title}** to queue.`);
    queue.get(message.guild.id).songs.push(song);

    try {
      // Here we try to join the voicechat and save our connection into our object.
      var connection = await voiceChannel.join();
      queueConstruct.connection = connection;

      // Calling the play function to start a song
      play(message.guild, queueConstruct.songs[0]);
    } catch (err) {
      // Printing the error message if the bot fails to join the voicechat
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  
  // If we already have a server queue
  } else {

    // makes sure you have money to play the song
    if (wallet.getWallet(message.author.id) < song.cost) {
      message.channel.send(`You dont have enough money to play a song.`);
      return;
    }

    // adds it to queue
    message.channel.send(`${wallet.getNickFromID(song.requester)} has added **${song.title}** to the queue.`);
    serverQueue.songs.push(song);

    // Somehow got disconnected... Reconnecting and playing song
    if (serverQueue.connection == null) {
      console.log("needed?");
      try {
        console.log("We were disconnected... reconnecting...")
        var connection = await voiceChannel.join();
        serverQueue.connection = connection;
        play(message.guild, serverQueue.songs[0]);
      } catch (err) {
        // Printing the error message if the bot fails to join the voicechat
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    }
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
      bot.user.setPresence({ activity: {name: appConfig.coinName + " to the Moon!", type:"COMPETING" } });
      console.log("No more songs!");
    } catch (err) {
      console.log(err);
    }
    return;
  }

  // makes sure you have money to play the song
  if (wallet.getWallet(song.requester) < song.cost) {
    serverQueue.textChannel.send(`${wallet.getNickFromID(song.requester)} doesn't have enough money to play ${song.title}!`);
    serverQueue.songs.shift();
    play(guild, serverQueue.songs[0]);
    return;
  } 

  // Plays the next song in queue
  const dispatcher = serverQueue.connection.play(
    ytdl(song.url, {filter : 'audioonly', dlChunkSize: 0, highWaterMark: 1<<25, volume: false}), {bitrate: 96, volume: false}
  )
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  
  // Different event handlers used for debugging!
  dispatcher.on('start', () => {
    // Charges user for the song
    wallet.addPoints(defaultConfig.botId, song.cost);
    wallet.subtractPoints(song.requester, song.cost);
    wallet.updateMessage();
    serverQueue.textChannel.send(`${wallet.getNickFromID(song.requester)} has paid ${song.cost} ${appConfig.coinName} to play **${song.title}**.`);
  });

  dispatcher.on('error', error => {
    console.log("Dispatcher error: " + error);
    // Didn't play the song... trying again.
    setTimeout(() => {
      play(guild, serverQueue.songs[0]);
    }, 200);
  });

  // Used to queue the next song
  dispatcher.on('finish', (reason) => 
    {
      setTimeout(() => {
        console.log("Dispatcher Ended! Reason: " + reason);
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      }, 200);
    }
  )

  // Create embed
  sendMessage(serverQueue, dispatcher, song);
  song.interval = setInterval(() => {
    sendMessage(serverQueue, dispatcher, song);
  }, 2000);

  // Sets the bots presence to Now Playing: Song Name
  bot.user.setPresence({ activity: {name: song.title, type:"LISTENING" } });
}

// Used to skip current song for a cost
function skip(message) {
  const serverQueue = queue.get(message.guild.id);

  if (!serverQueue) return message.channel.send("There is no song that I could skip!");

  if (message.author.id === serverQueue.songs[0].requester || wallet.getWallet(message.author.id) > appConfig.skipCost) {
      if (message.author.id != serverQueue.songs[0].requester) {
        message.channel.send(`${wallet.getNickFromID(message.author.id)} has paid ${appConfig.skipCost} ${appConfig.coinName} to skip ${serverQueue.songs[0].title}.`);
        wallet.addPoints(defaultConfig.botId, appConfig.skipCost);
        wallet.subtractPoints(message.author.id, appConfig.skipCost);
        wallet.updateMessage();
      }
      if (serverQueue.songs[0].interval) clearInterval(serverQueue.songs[0].interval);
      if (serverQueue.connection) serverQueue.connection.dispatcher.end();
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
  if (serverQueue.songs[0].interval) clearInterval(serverQueue.songs[0].interval);
  if (serverQueue.connection) serverQueue.connection.dispatcher.end();
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
  var seek = dispatcher.streamTime / 1000;
  let nowPlaying = new MessageEmbed()
  .setTitle(`${appConfig.coinName} Bot - Now playing:`)
  .setDescription(`${song.title}\n\`Requested by: ${wallet.getNickFromID(song.requester)}\``)
  .setColor("#c391ff")
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
  
  // Setting the time remaining of the song.
  if (song.length > 0) nowPlaying.setFooter("Time Remaining: " + new Date((song.length - seek) * 1000).toISOString().substr(14, 5));
  if (seek > song.length && typeof interval !== "undefined") clearInterval(interval);

  // Update embed if it exists
  if (!song.message) serverQueue.textChannel.send(nowPlaying).then(sent=>{song.message = sent});
  else song.message.edit(nowPlaying);
}

module.exports = {help, execute, skip, adminSkip, listSongs}