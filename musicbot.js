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
	if(!message.content.startsWith("!") || bot.user == message.author) return;
    if(!message.channel.isPrivate) {
        var cmd = message.content.split(" ")[0];
        console.log("treating " + cmd + " from " + message.author.username);
        if(Module.commands.hasOwnProperty(cmd)) Module.commands[cmd].process(bot, message);
        else bot.reply(message, "Invalid command. Please check out the bot commands using !help");
    }
});

// shamelessly stolen from meew0
process.on('uncaughtException', function(err) {
  if (err.code == 'ECONNRESET') {
    console.log('Got an ECONNRESET! This is *probably* not an error. Stacktrace:');
    console.log(err.stack);
  } else {
    // Normal error handling
    console.log(err);
    console.log(err.stack);
    process.exit(0);
  }
});

bot.loginWithToken(Config.token);