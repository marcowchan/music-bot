var Discord = require("discord.js");
var Config = require("./lib/config.json");
var Module = require("./lib/module");

var bot = new Discord.Client();
bot.on('warn', (m) => console.log('[warn]', m));
bot.on('debug', (m) => console.log('[debug]', m));

bot.on("ready", function(message) {
    console.log("Music Bot is ready [" + new Date().toLocaleTimeString('en-US', Config.timeOptions) + "]");
});

bot.on("disconnected", function () {
	console.log("Disconnected!");
	process.exit(1);
});

bot.on("message", function(message) {
	if(!message.content.startsWith("!") || bot.user == message.author) {
	    return;
	}
    if(!message.channel.isPrivate) {
        var cmd = message.content.split(" ")[0];
        console.log("treating " + cmd + " from " + message.author.username);
        if(Module.commands.hasOwnProperty(cmd)) {
        	Module.commands[cmd].process(bot, message);
        }
        else {
            bot.reply(message, "Invalid command. Please check out the bot commands.");
        }
    }
});

bot.login(Config.email, Config.password);