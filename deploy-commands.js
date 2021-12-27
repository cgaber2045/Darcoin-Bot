const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
require('dotenv').config();
global.pjson = require('./package.json');
global.config = require('./config');

// Setting different configs for the bot
global.defaultConfig = process.env.CONFIG == "production" ? config.production : config.testing;
global.appConfig = config.app;

const commands = [];

const commandFiles = fs.readdirSync('./lib').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const module = require(`./lib/${file}`);
	commands.push(...module.commands());
}

const about = {
	"name": "about",
	"description": "Use this command to find out about the bot.",
}

commands.push(about);

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

rest.put(Routes.applicationCommands('875055296857387018'), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);