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
const { getVoiceConnection, joinVoiceChannel, AudioPlayerStatus, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');

// Basic queue to hold the music
var queue = new Map();

// Checking if youtube url
function matchYoutubeUrl(url) {
  var p = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  if(url.match(p)) return url.match(p)[1];
  return false;
}

// Run by user typing !play
async function execute(interaction, args) {
  if (args.data.length < 1) {
    interaction.reply(`Not enough arguments provided. \n !play <youtube url> - Use this command to play a song for 8 seconds per ${appConfig.coinName}. E.x. a 3 minute vid costs 23 ${appConfig.coinName}.`);
    return;
  }

  // Gets the current voice channel so the bot can join it.
  if (interaction.guild === null) return interaction.reply("You need to be in a voice channel to play music!");
  const voiceChannel = interaction.member.voice.channel;

  // Adds the song queue for this current server.
  const serverQueue = queue.get(interaction.guild.id);

  if (!voiceChannel) {
    return interaction.reply("You need to be in a voice channel to play music!");
  }

  // Takes in the search the user inputed
  const searchString = args.get('song').value;

  var songInfo;

  // Gets a list of matching songs from the ytsearch api
  if (matchYoutubeUrl(searchString)) {
    // If we are given a URL, just play it.
    songInfo = await ytdl.getInfo(searchString, { requestOptions: {headers: {Cookie: cookieString}}});
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
    requester: interaction.user.id,
    cost: Math.ceil(songInfo.seconds / appConfig.playCost),
    message: null,
    interval: null
  };

  // Checks to see if we have a queue yet
  if (!serverQueue) {
    // Creating the construct for our queue
    const queueConstruct = {
      textChannel: interaction.channel,
      voiceChannel: voiceChannel,
      audioPlayer: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    // Setting the queue using our construct
    queue.set(interaction.guild.id, queueConstruct);

    // makes sure you have money to play the song
    if (wallet.getWallet(interaction.user.id) < song.cost) {
      interaction.reply(`You don't have enough money to play a song!`);
      return;
    } 

    // Added song to queue
    interaction.reply(`${wallet.getNickFromID(song.requester)} has added **${song.title}** to queue.`);
    queue.get(interaction.guild.id).songs.push(song);

    try {
      // Here we try to join the voicechat.
      joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      // Calling the play function to start a song
      play(interaction.guild, queueConstruct.songs[0]);
    } catch (err) {
      // Printing the error message if the bot fails to join the voicechat
      console.log(err);
      queue.delete(interaction.guild.id);
      return interaction.reply(err);
    }
  
  // If we already have a server queue
  } else {

    // makes sure you have money to play the song
    if (wallet.getWallet(interaction.user.id) < song.cost) {
      interaction.reply(`You dont have enough money to play a song.`);
      return;
    }

    // adds it to queue
    interaction.reply(`${wallet.getNickFromID(song.requester)} has added **${song.title}** to the queue.`);
    serverQueue.songs.push(song);
  }
}

// Actually play song
function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  const connection = getVoiceConnection(guild.id);
  // Out of songs to play
  if (!song) {
    try {
      connection.destroy();
      queue.delete(guild.id);
      bot.user.setPresence({ activities: [{name: appConfig.coinName + " to the Moon!", type:"COMPETING" }] });
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
  const player = createAudioPlayer();
  const stream = ytdl(song.url, {filter : 'audioonly', dlChunkSize: 0, highWaterMark: 1<<25, volume: false, requestOptions: {headers: {Cookie: cookieString}}});
  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
  });
  serverQueue.audioPlayer = player;
  player.play(resource);
  connection.subscribe(player);
  
  // Music started
  serverQueue.audioPlayer.on(AudioPlayerStatus.Playing, () => {
    // Charges user for the song
    wallet.addPoints(defaultConfig.botId, song.cost);
    wallet.subtractPoints(song.requester, song.cost);
    wallet.updateMessage();
    serverQueue.textChannel.send(`${wallet.getNickFromID(song.requester)} has paid ${song.cost} ${appConfig.coinName} to play **${song.title}**.`);

    // Create embed
    sendMessage(serverQueue, player, song);
    song.interval = setInterval(() => {
      sendMessage(serverQueue, player, song);
    }, 2000);

    // Sets the bots presence to Now Playing: Song Name
    bot.user.setPresence({ activities: [{name: song.title, type:"LISTENING" }] });
  });

  // Used to queue the next song
  serverQueue.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      // Song over; play next one.
      setTimeout(() => {
        console.log("Song Ended!");
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      }, 200);
  });
}

// Used to skip current song for a cost
function skip(interaction) {
  const serverQueue = queue.get(interaction.guild.id);
  if (!serverQueue) return interaction.reply("There is no song that I could skip!");

  if (interaction.user.id === serverQueue.songs[0].requester || wallet.getWallet(interaction.user.id) > appConfig.skipCost) {
      if (interaction.user.id != serverQueue.songs[0].requester) {
        interaction.reply(`${wallet.getNickFromID(interaction.user.id)} has paid ${appConfig.skipCost} ${appConfig.coinName} to skip **${serverQueue.songs[0].title}**.`);
        wallet.addPoints(defaultConfig.botId, appConfig.skipCost);
        wallet.subtractPoints(interaction.user.id, appConfig.skipCost);
        wallet.updateMessage();
      } else interaction.reply(`${wallet.getNickFromID(interaction.user.id)} has skipped **${serverQueue.songs[0].title}**.`);
      if (serverQueue.songs[0].interval) clearInterval(serverQueue.songs[0].interval);
      try {serverQueue.audioPlayer.stop();} 
      catch (error) {console.log(error);}
  } else {
    interaction.reply(`You cannot afford to skip the song!`);
    return;
  }
}

// Used to skip current song for free for admins
function adminSkip(interaction) {
  const serverQueue = queue.get(interaction.guild.id);
  if (!serverQueue) return interaction.reply("There is no song that I could skip!");
  interaction.reply(`${wallet.getNickFromID(interaction.user.id)} has skipped ${serverQueue.songs[0].title}.`);
  if (serverQueue.songs[0].interval) clearInterval(serverQueue.songs[0].interval);
  try { serverQueue.audioPlayer.stop(); } 
  catch (error) { console.log(error); }
}

// Prints all the songs in the queue.
function listSongs(interaction) {
  const serverQueue = queue.get(interaction.guild.id);

  var songs = "";

  if (!serverQueue || serverQueue.songs.length < 1) {
    songs += "No songs in queue!";
  } else {
    for(var x in serverQueue.songs) {
      if (x == 0) songs += "**Now playing:** " + serverQueue.songs[x].title + "\n\n**Queue:**\n";
      else songs += `> [${x}] ${serverQueue.songs[x].title} \n`;
    }
  }
  
  interaction.reply(songs);
}

// The display message for the currently playing song
function sendMessage(serverQueue, player, song) {
  var seek = Math.ceil(player.state.playbackDuration / 1000);
  if (isNaN(seek)) seek = song.length;
  let nowPlaying = new MessageEmbed()
  .setTitle(`${appConfig.coinName} Bot - Now playing:`)
  .setDescription(`${song.title}\n\`Requested by: ${wallet.getNickFromID(song.requester)}\``)
  .setColor("#c391ff")
  .setThumbnail(`${song.thumbnail}`)
  .addField(
    "\u200b",
    new Date(seek * 1000).toISOString().substring(14, 19) +
    " [" +
    createBar.splitBar(song.length == 0 ? seek : song.length, seek, 20)[0] +
    "] " +
    (song.length == 0 ? " ◉ LIVE" : new Date(song.length * 1000).toISOString().substring(14, 19)),
    false
  );
  
  // Setting the time remaining of the song.
  if (song.length > 0) nowPlaying.setFooter("Time Remaining: " + new Date((song.length - seek) * 1000).toISOString().substr(14, 5));
  if (seek >= song.length && typeof song.interval !== "undefined") clearInterval(song.interval);

  // Update embed if it exists
  if (!song.message) serverQueue.textChannel.send({ embeds: [nowPlaying] }).then(sent=>{song.message = sent});
  else song.message.edit({ embeds: [nowPlaying] });
}

function commands() {
  return [
    {
      "name": "play",
      "description": `Use this command to play a song for ${appConfig.playCost} song.length per ${appConfig.coinName}. E.x. a 3 minute vid costs ${180 / appConfig.playCost}.`,
      "options": [
        {
          "type": 3,
          "name": "song",
          "description": "The name/url of the youtube video.",
          "required": true
        }
      ]
    },
    {
      "name": "skip",
      "description": `Use this command to skip a song for ${appConfig.skipCost} ${appConfig.coinName}.`
    },
    {
      "name": "adminskip",
      "description": `Use this command to skip a song for free.`
    },
    {
      "name": "queue",
      "description": `Use this command to view all the songs in queue.`
    }
  ]
}

module.exports = {commands, execute, skip, adminSkip, listSongs}