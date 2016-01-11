var Config = require("./config.json");
var superagent = require("superagent");
var url = require("url");
var ytdl = require("ytdl-core");
var boundedChannel = "";
var currentStream = false;
var currentVideo = false;
var playlist = [];

function queueSongs(bot, msg, videos) {
	if(videos.length > 0) {
		if(videos[0].startsWith("http")) {
			videos[0] = url.parse(videos[0], true).query.v;
		}
		if(!videos[0]) {
			bot.reply(msg, "Y u do dis.");
			videos.shift();
			queueSongs(bot, msg, videos);
			return;
		}
		var requestUrl = "https://www.youtube.com/watch?v=" + videos[0];
		ytdl.getInfo(requestUrl, function(err, info) {
			if(err) {
				bot.reply(msg, "**ytdl**\n" + err);
				videos.shift();
				queueSongs(bot, msg, videos);
			}
			else {
				var message = "***#" + info.video_id + "***\nQueued **" + info.title + "**";
				message +=  " by **" + info.author + "** *(" + info.view_count + " views)* " + timeFormat(info.length_seconds);
				bot.sendMessage(msg.channel, message);
				if(!currentVideo) {
					play(bot, info);
				}
				else {
					playlist.push(info);
				}
				videos.shift();
				queueSongs(bot, msg, videos);
			}
		});
	}
}
function playNext(bot){
	if(playlist.length > 0) {
		play(bot, playlist.shift());
	}
}

function playStop(bot) {
	if(bot.voiceConnection){
		bot.voiceConnection.stopPlaying();
		currentVideo = false;
		playNext(bot);
	}
}

function play(bot, info) {
	if(!info) {
		return;
	}
	currentVideo = info;
	currentStream = ytdl.downloadFromInfo(info, {quality: "lowest", filter: function(format) { return format.container === 'mp4' }});
	currentStream.on('error', function(err) {
      	boundedChannel.sendMessage("There was an error during playback! **" + err + "**");
    });

    currentStream.on('end', function () { 
    	setTimeout(function() { playStop(bot); }, 16000); 
    });
    bot.voiceConnection.playRawStream(currentStream);
}

function timeFormat(time) {
	var seconds = time % 60;
	var minutes = (time - seconds) / 60;
	if(seconds < 10) {
		seconds = "0" + seconds;
	}
	return "[" + minutes + ":" + seconds + "]";
}

var commands = {
    "!help": {
		description: "displays all commands and usage information",
		process: function(bot, msg) {
			var message = "";
			Object.keys(commands).forEach(function(cmd) {
				message += "```\n" + cmd + " ";
				if(commands[cmd].hasOwnProperty("usage")) {
					message += commands[cmd].usage;
				}
				message += "\n" + commands[cmd].description + "\n```\n";
			});
			if(message.length > 2000) {
				var index = 1604 + message.substr(1600).indexOf("\n```\n```\n");
				bot.sendMessage(msg.channel, message.substr(0, index));
				bot.sendMessage(msg.channel, message.substr(index));
			}
			bot.sendMessage(msg.channel, message);
		}
	},
    "!ping": {
        description: "pongs to the message channel that was ping-ed",
        process: function (bot, msg) {
            bot.sendMessage(msg.channel, "pong!");
		    //alert the console
            console.log("pong-ed " + msg.author.username);
        }
    }, 
    "!myId": {
        description: "returns the user id of the sender",
        process: function(bot,msg){bot.sendMessage(msg.channel,msg.author.id);}
    },
    "!channelId": {
        description: "gives the channel id",
        process: function(bot,msg,suffix){

			bot.sendMessage(msg.channel, msg.channel.id);

        }
	},
	"!init": {
    	usage: "(voice channel to join)",
    	description: "joins a voice channel binds the text channel where the command was issued. defaults to channel specified in auth.json",
    	process: function(bot, msg) {
    		if(boundedChannel) {
    			bot.reply(msg, "Already bounded to another voice and text channel");
    			return;
    		}
    		var channelToJoin = msg.content.substr(6).trim();
    		if(!channelToJoin){
    			var serverName = msg.channel.server.name;
    			if(Config.defaultChannels.hasOwnProperty(serverName)) {
    				channelToJoin = Config.defaultChannels[serverName];
    			}
    			else {
    				channelToJoin = msg.channel.server.channels.get("type", "voice").name;
    			}
    		}
    		var v_channel = msg.channel.server.channels.get("name", channelToJoin);
			if(!v_channel) {
				bot.reply(msg, "There is no channel named " + channelToJoin);
				return;
			}
			if(v_channel.type != "voice") {
				bot.reply(msg, channelToJoin + " is not a Voice Channel");
				return;
			}
			boundedChannel = msg.channel;
			bot.sendMessage(msg.channel, "Binding to **" + boundedChannel.name + "** and joining **" + v_channel.name + "**");
			bot.joinVoiceChannel(v_channel);
    	}
    },
    "!destroy": {
    	description: "Unbinds from currently bounded text channel and leaves the voice channel",
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		if(msg.channel.id != boundedChannel.id) {
    			bot.reply(msg, "Error: Bot is currently bounded to the channel **" + boundedChannel.name + "** in the server **" + boundedChannel.server + "**");
    			return;
    		}
    		bot.sendMessage(msg.channel, "Unbinding from **" + boundedChannel.name + "** and leaving voice channel.");
    		bot.leaveVoiceChannel();
    		playlist = [];
    		boundedChannel = "";
    		currentVideo = false;
    	}
    },
    "!queue": {
    	usage: "(video id or link) (video id or link) optional",
    	description: 'queues a youtube video for the bot to play. You can queue more than 1 video at a time.\nEx. https://www.youtube.com/watch?v=**id here**',
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		var videos = msg.content.split(/\s+/);
    		videos.shift();
    		if(videos.length == 0) {
    			bot.reply(msg, "Improper usage: You need to specify a video.");
    			return;
    		}
    		queueSongs(bot, msg, videos);
    	}
    },
    "!playlist": {
    	usage: "(playlist id or link)",
    	description: 'queues a youtube playlist (only the first 50 videos)',
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		if(!Config.youtube_api_key) {
    			bot.reply(msg, "No API key in config.json.");
    			return;
    		}
    		var playlist = msg.content.substr(10).trim();
    		if(!playlist) {
    			bot.reply(msg, "Improper usage: You need to specify a playlist.");
    			return;
    		}
    		if(playlist.startsWith("http")) {
				playlist = url.parse(playlist, true).query.list;
			}
    		var requestUrl = "https://www.googleapis.com/youtube/v3/playlistItems" +
      "?part=contentDetails&maxResults=50&playlistId=" + playlist + "&key=" + Config.youtube_api_key;
			superagent.get(requestUrl).end(function(error, response) {
				if(error) {
					bot.reply(msg, error);
				}
				else {
					if(response.body.items.length == 0) {
						bot.reply(msg, "Error: This playlist has no videos");
						return;
					}
					var videos = [];
					response.body.items.forEach(function(item){
						videos.push(item.contentDetails.videoId);
					});
					queueSongs(bot, msg, videos);
				}
			});
    	}
    },
    "!next": {
    	description: "plays the next song",
    	process: function(bot, msg) {
    		playStop(bot);
    	}
    },
    "!song": {
    	description: "displays the current song playing",
    	process: function(bot, msg) {
    		bot.sendMessage(msg.channel, currentVideo.title);
    	}
    },
    "!link": {
    	description: "displays the current song's link",
    	process: function(bot, msg) {
    		bot.sendMessage(msg.channel, currentVideo.loaderUrl);
    	}
    },
    "!list": {
    	description: "lists all the songs currently in queue.",
    	process: function(bot, msg) {
    		var message = "";
    		playlist.forEach(function(video){
    			message += "***#" + video.video_id + "***\n" + video.title + "\n";
    		});
    		if(message) {
    			if(message.length > 2000) {
    				bot.reply(msg, "Error: Message is over 2000 characters.");
    			}
    			else {
    				bot.sendMessage(msg.channel, message);
    			}
    		}
    		else {
    			bot.sendMessage(msg.channel, "There are no songs queued.");
    		}
    	}
    },
    "!remove": {
    	usage: "(video id)",
    	description: "removes the specified song from the queue",
    	process: function(bot, msg) {
    		var id = msg.content.substr(7).trim();
    		if(!id) {
    			bot.reply(msg, "Improper Usage: You need to specify the video id.");
    			return;
    		}
    		var videoToDelete = playlist.findIndex(function(info, idx) {
    			return info.video_id == id;
    		});
    		if(videoToDelete == -1) {
    			bot.reply(msg, "No video in queue has that id.");
    			return;
    		}
    		playlist.splice(videoToDelete, 1);
    	}
    }
};

exports.commands = commands;