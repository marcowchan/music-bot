# Discord Music Bot
My Discord music bot based off of meew0's Lethe and chalda's DiscordBot and made possible by hydrabolt's [Discord.js](https://github.com/hydrabolt/discord.js).

**Warning:** This bot is built on the unofficial Discord API and using experimental features and will probably break in the future.

## Requirements
+ node.js

If using Windows:
+ Visual Studio 2015 (Express, Community, or Enteprise)
+ Python 2.7

## Installation
From what I've seen, the easiest way to get your bot up and running is by using a linux workspace in a cloud.
I used [Cloud9] (https://c9.io) to develop and run my bot.


If using windows, make sure to install node-opus before everything else.
```
$ npm install node-opus
```
And [ffmpeg](https://www.ffmpeg.org/download.html).

For Linux(if you dont already have it) or c9:

```
$ sudo add-apt-repository ppa:mc3man/trusty-media
$ sudo apt-get update
$ sudo apt-get install ffmpeg
```

Then install all the modules
```
$ npm install discord.js
$ npm install fs
$ npm install request
$ npm install url
$ npm install ytdl-core
```

## Usage
Make sure to create config.json by using the example files
```
$ node musicbot.js
```

## Commands
```
!help 
displays all commands and usage information
```
```
!ping 
pongs to the message channel that was ping-ed
```
```
!myId 
returns the user id of the sender
```
```
!channelId 
gives the channel id
```
```
!init (voice channel to join)
joins a voice channel binds the text channel where the command was issued. defaults to channel specified in auth.json
```
```
!destroy 
Unbinds from currently bounded text channel and leaves the voice channel
```
```
!queue (youtube video id or link) or (soundcloud link)
queues a youtube or soundcloud song for the bot to play. You can queue more than 1 video at a time.
Ex. https://www.youtube.com/watch?v=**id here**
```
```
!playlist (youtube playlist id or link) or (soundcloud link)
queues a youtube (only the first 50 videos) or soundcloud playlist
```
```
!next 
plays the next song
```
```
!song 
displays the current song playing
```
```
!link 
displays the current song's link
```
```
!list 
lists all the songs currently in queue.
```
```
!remove (video id)
removes the specified song from the queue
```
