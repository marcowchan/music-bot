var Config = require("./config.json");
var fs = require("fs");
var request = require("request");
var url = require("url");
var ytdl = require("ytdl-core");
var boundedChannel = false;
var currentStream = false;
var currentSong = false;
var playlist = [];

function queueSongs(bot, msg, videos) {
	if(videos.length > 0) {
		if( videos[0].indexOf("soundcloud.com") > -1) {
			request("http://api.soundcloud.com/resolve.json?url=" + videos[0] + "&client_id=71dfa98f05fa01cb3ded3265b9672aaf", function (error, response, body) {
				if(error) bot.reply(error);
				else if (response.statusCode == 200) {
				  	body = JSON.parse( body );
				  	if(body.tracks) bot.reply(msg, "More than 1 song was found. Please use !playlist to queue these songs.");
				  	else {
						var message = "***#" + body.id + "***\nQueued **" + body.title + "**";
						message +=  " by **" + body.user.username + "** *(" + body.playback_count + " times played)* " + timeFormat(body.duration/1000);
						bot.sendMessage(boundedChannel, message, function(err, scTrackInfo) {
							if(err) console.log(err);
							else bot.deleteMessage(scTrackInfo, {wait:240000});
						});
						var sc_logo = fs.createReadStream("./lib/sc_logo.png");
						bot.sendFile(boundedChannel, sc_logo, "soundcloud_logo.png", function(err, logo) {
							if(!err) bot.deleteMessage(logo, {wait:240000});
							else if(err.status == 403) {
								bot.sendMessage(boundedChannel, "**Powered by SoundCloud**", function(e, l) {
									bot.deleteMessage(l, {wait:240000});
								});
							}
						});
						if(!currentSong) play(bot, body);
						else playlist.push(body);

					}
				}
				else bot.reply(msg, "Error: " + response.statusCode + " - " + response.statusMessage);
				videos.shift();
				queueSongs(bot, msg, videos);
			});
			return;
		}
		if(videos[0].startsWith("PL")) {
			bot.reply(msg, "Please use !playlist to queue playlists.");
			return;
		}
		if(videos[0].indexOf("youtube.com") > -1) videos[0] = url.parse(videos[0], true).query.v;
		if(!videos[0]) {
			bot.reply(msg, "Y u do dis.");
			videos.shift();
			queueSongs(bot, msg, videos);
			return;
		}
		videos[0] = videos[0].replace(/\#+/, "");
		var requestUrl = "https://www.youtube.com/watch?v=" + videos[0];
		ytdl.getInfo(requestUrl, function(err, info) {
			if(err) bot.reply(msg, "**ytdl**\n" + err);
			else {
				var message = "***#" + info.video_id + "***\nQueued **" + info.title + "**";
				message +=  " by **" + info.author + "** *(" + info.view_count + " views)* " + timeFormat(info.length_seconds);
				bot.sendMessage(boundedChannel, message, function(e, ytInfoMsg) {
					bot.deleteMessage(ytInfoMsg, {wait:240000})
				});
				if(!currentSong) play(bot, info);
				else playlist.push(info);
			}
			videos.shift();
			queueSongs(bot, msg, videos);
		});
	}
}
function playNext(bot){
	if(playlist.length > 0) play(bot, playlist.shift());

}

function playStop(bot) {
	if(bot.voiceConnection){
		bot.voiceConnection.stopPlaying();
		currentSong = false;
		playNext(bot);
	}
}

function play(bot, info) {
	currentSong = info;
	if(!info.video_id) {
		currentStream = request("http://api.soundcloud.com/tracks/" + info.id + "/stream?consumer_key=71dfa98f05fa01cb3ded3265b9672aaf");
		currentStream.on('error', function(err) {
      		bot.sendMessage(boundedChannel, "There was an error during playback! **" + err + "**");
    	});
    	currentStream.on('end', function () { 
	    	setTimeout(function() { playStop(bot); }, 16100); 
	    });
		bot.voiceConnection.playRawStream(currentStream);
		return;
	}
	currentStream = ytdl.downloadFromInfo(info, {quality: "lowest", filter: function(format) { return format.container === 'mp4' }});
	currentStream.on('error', function(err) {
      	boundedChannel.sendMessage("There was an error during playback! **" + err + "**");
    });

    currentStream.on('end', function () { 
    	setTimeout(function() { playStop(bot); }, 16100); 
    });
    bot.voiceConnection.playRawStream(currentStream);
}

function timeFormat(time) {
	var seconds = Math.floor(time % 60);
	var minutes = Math.floor((time - seconds) / 60);
	if(seconds < 10) seconds = "0" + seconds;
	return "[" + minutes + ":" + seconds + "]";
}

var commands = {
    "!help": {
		description: "displays all commands and usage information",
		process: function(bot, msg) {
			var message = "";
			Object.keys(commands).forEach(function(cmd) {
				message += "```\n" + cmd + " ";
				if(commands[cmd].hasOwnProperty("usage")) message += commands[cmd].usage;
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
		    console.log(boundedChannel);
            console.log("pong-ed " + msg.author.username);
        },
    },
    "!init": {
    	usage: "(voice channel to join)",
    	description: "joins a voice channel binds the text channel where the command was issued. defaults to channel specified in config.json",
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
    			else channelToJoin = msg.channel.server.channels.get("type", "voice").name;
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
			console.log(v_channel.id);
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
    		currentSong = false;
    	}
    },
    "!queue": {
    	usage: "(youtube video id or link) or (soundcloud link)",
    	description: 'queues a youtube or soundcloud song for the bot to play. You can queue more than 1 video at a time.\nEx. https://www.youtube.com/watch?v=**id here**',
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		if(boundedChannel.id != msg.channel.id) {
    			bot.reply(msg, "Currently bounded to a different text channel.");
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
    	usage: "(youtube playlist id or link) or (soundcloud link)",
    	description: 'queues a youtube (only the first 50 videos) or soundcloud playlist',
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		if(boundedChannel.id != msg.channel.id) {
    			bot.reply(msg, "Currently bounded to a different text channel.");
    			return;
    		}
    		var videos = [];
    		var playlist = msg.content.substr(10).trim();
    		if(!playlist) {
    			bot.reply(msg, "Improper usage: You need to specify a playlist.");
    			return;
    		}
    		if(playlist.indexOf("soundcloud.com") > -1) {
	    		request("http://api.soundcloud.com/resolve.json?url=" + playlist + "&client_id=71dfa98f05fa01cb3ded3265b9672aaf", function (error, response, body) {
					if(error) bot.reply(error);
					else if (response.statusCode == 200) {
						body = JSON.parse( body );
						if(body.tracks) {
							body.tracks.forEach(function(track) {
								videos.push(track.permalink_url);
							});
							queueSongs(bot, msg, videos);
						}
						else bot.reply(msg, "Playlist not found. Use !queue to queue a single song.");
					}
					else bot.reply(msg, "Error: " + response.statusCode + " - " + response.statusMessage);
				});
				return;
    		}
    		if(!Config.youtube_api_key) {
    			bot.reply(msg, "No API key in config.json.");
    			return;
    		}
    		if(playlist.indexOf("youtube.com") > -1) playlist = url.parse(playlist, true).query.list;
    		var requestUrl = "https://www.googleapis.com/youtube/v3/playlistItems" +
      "?part=contentDetails&maxResults=50&playlistId=" + playlist + "&key=" + Config.youtube_api_key;
			request(requestUrl, function(error, response, body) {
				if(error) bot.reply(msg, error);
				else if (response.statusCode == 200) {
					body = JSON.parse( body );
					if(body.items.length == 0) {
						bot.reply(msg, "Error: This playlist has no videos");
						return;
					}
					body.items.forEach(function(item){
						videos.push(item.contentDetails.videoId);
					});
					queueSongs(bot, msg, videos);
				}
				else bot.reply(msg, "Error: " + response.statusCode + " - " + response.statusMessage);
			});
    	}
    },
    "!next": {
    	description: "plays the next song",
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		if(boundedChannel.id != msg.channel.id) {
    			bot.reply(msg, "Currently bounded to a different text channel.");
    			return;
    		}
    		playStop(bot);
    	}
    },
    "!song": {
    	description: "displays the current song playing",
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		if(boundedChannel.id != msg.channel.id) {
    			bot.reply(msg, "Currently bounded to a different text channel.");
    			return;
    		}
    		bot.sendMessage(msg.channel, currentSong.title);
    	}
    },
    "!link": {
    	description: "displays the current song's link",
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		if(boundedChannel.id != msg.channel.id) {
    			bot.reply(msg, "Currently bounded to a different text channel.");
    			return;
    		}
    		if(currentSong.loaderUrl) bot.sendMessage(msg.channel, currentSong.loaderUrl);
    		else if (currentSong.permalink_url) bot.sendMessage(msg.channel, currentSong.permalink_url);
    	}
    },
    "!list": {
    	description: "lists all the songs currently in queue.",
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		if(boundedChannel.id != msg.channel.id) {
    			bot.reply(msg, "Currently bounded to a different text channel.");
    			return;
    		}
    		var message = "";
    		playlist.forEach(function(video){
    			var id;
    			if(video.video_id) id = video.video_id;
    			else id = video.id;
    			message += "***#" + id + "***\n" + video.title + "\n";
    		});
    		if(message) {
    			if(message.length > 2000) bot.reply(msg, "Error: Message is over 2000 characters.");
    			else bot.sendMessage(msg.channel, message);
    		}
    		else bot.sendMessage(msg.channel, "There are no songs queued.");
    	}
    },
    "!remove": {
    	usage: "(video id)",
    	description: "removes the specified song from the queue",
    	process: function(bot, msg) {
    		if(!boundedChannel) {
    			bot.reply(msg, "Not currently bound to any channels.");
    			return;
    		}
    		if(boundedChannel.id != msg.channel.id) {
    			bot.reply(msg, "Currently bounded to a different text channel.");
    			return;
    		}
    		var id = msg.content.substr(7).trim();
    		if(!id) {
    			bot.reply(msg, "Improper Usage: You need to specify the video id.");
    			return;
    		}
    		id = id.replace(/\#+/, "");
    		var videoToDelete = playlist.findIndex(function(info, idx) {
    			return info.video_id == id || info.id == id;
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