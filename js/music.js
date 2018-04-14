const ytdl = require('youtube-dl');


const geniusId = "P16rUAwFfDqa6orLH8sd5_VGpWTDVNnxXwjkVdEGuQODF6_D2miuEPQPhmSXsik7";
const geniusSecret = "5a9Kbhd31hyoQTN0Tr7cTds9PkrjZFXM5FDDrPZr8KFmBQn--kGS9iX3UOSVoMlHWcX0ZpFIqAWQpadtUd4t2g";
const geniusClient = "l5zrX9XIDrJuz-kS1u7zS5sE81KzrH3qxZL5tAvprE9GG-L1KYlZklQDXL6wf3sn";
const credentials = {
  client: {id: geniusId, secret: geniusSecret},
  auth: {tokenHost: "https://api.genius.com"}
};
const geniusRequest = {
  hostname: 'api.genius.com',
  path: '/search/',
  headers:
      {"Accept": "application/json", "Authorization": "Bearer " + geniusClient},
  method: "GET"
};
// const oauth2 = require('simple-oauth2').create(credentials);
const https = require('https');

var initialized = false;

exports.helpMessage = undefined;

var prefix, Discord, client, command, common;
var myPrefix, helpMessage;

var broadcasts = {};

const special = {
  'vi rap': {
    cmd: 'vi',
    url: "https://www.youtube.com/watch?v=c1NoTNCiomU",
    file: '/home/discord/SpikeyBot-Discord/js/sounds/viRap.webm'
  },
  'airhorn': {
    cmd: 'airhorn',
    url: "",
    file: '/home/discord/SpikeyBot-Discord/js/sounds/airhorn.mp3'
  },
  'rickroll': {
    cmd: 'rickroll',
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    file: '/home/discord/SpikeyBot-Discord/js/sounds/rickRoll.webm'
  },
  'kokomo': {
    cmd: 'kokomo',
    url: "https://www.youtube.com/watch?v=fJWmbLS2_ec",
    file: "/home/discord/SpikeyBot-Discord/js/sounds/kokomo.webm"
  }
};

const ytdlOpts =
    ['-f bestaudio/best', '--no-playlist', '--default-search=auto'];

// Initialize module.
exports.begin = function(prefix_, Discord_, client_, command_, common_) {
  prefix = prefix_;
  myPrefix = prefix;
  Discord = Discord_;
  client = client_;
  command = command_;
  common = common_;

  command.on('play', commandPlay, true);
  command.on(['leave', 'stop', 'stfu'], commandLeave, true);
  command.on('skip', commandSkip, true);
  command.on(['queue', 'playing'], commandQueue, true);
  command.on(['remove', 'dequeue'], commandRemove, true);
  command.on('lyrics', commandLyrics);

  command.on('kokomo', msg => {
    msg.content = "?play kokomo";
    command.trigger('play', msg);
  });
  command.on('vi', msg => {
    msg.content = "?play vi rap";
    command.trigger('play', msg);
  });
  command.on('airhorn', msg => {
    msg.content = "?play airhorn";
    command.trigger('play', msg);
  });
  command.on('rickroll', msg => {
    msg.content = "?play rickroll";
    command.trigger('play', msg);
  });

  initialized = true;
  common.LOG("Music Init", "Music");
};

// Removes all references to external data and prepares for unloading.
exports.end = function() {
  if (!initialized) return;
  initialized = false;
  command.deleteEvent('play');
  command.deleteEvent(['leave', 'stop', 'stfu']);
  command.deleteEvent('skip');
  command.deleteEvent(['queue', 'playing']);
  command.deleteEvent(['remove', 'dequeue']);
  delete command;
  delete Discord;
  delete client;
  delete common;
};

// Creates formatted string for mentioning the author of msg.
function mention(msg) {
  return `<@${msg.author.id}>`;
}
// Replies to the author and channel of msg with the given message.
function reply(msg, text, post) {
  post = post || "";
  return msg.channel.send(`${mention(msg)}\n\`\`\`\n${text}\n\`\`\`${post}`);
}

// Format the info response from ytdl into a human readable format.
function formatSongInfo(info) {
  var output = new Discord.RichEmbed();
  output.setDescription(
      info.title + "\nUploaded by " + info.uploader + "\n[👍 " +
      formNum(info.like_count) + " 👎 " + formNum(info.dislike_count) +
      "][👁️ " + formNum(info.view_count) + "]\n[" +
      Math.floor(info._duration_raw / 60) + "m " + info._duration_raw % 60 +
      "s]");
  if (info.thumbnail) output.setThumbnail(info.thumbnail);
  output.setURL(info.webpage_url);
  output.setColor([50, 200, 255]);
  return output;
}
function formNum(num) {
  var output = "";
  var numString = (num + "");
  var tmpString = [];
  for (var i = 0; i < numString.length; i++) {
    if (i > 0 && i % 3 === 0) tmpString.push(",");
    tmpString.push(numString.substr(-i - 1, 1));
  }
  return tmpString.reverse().join('');
}
// Add a song to the given broadcast's queue and start playing it not already.
function enqueueSong(broadcast, song, msg, info) {
  broadcast.queue.push({request: msg, song: song, info: info});
  if (broadcast.voice) {
    try {
      startPlaying(broadcast);
    } catch (err) {
      console.log(err);
      reply(msg, "Failed to start music stream!");
      command.trigger('stop', msg);
    }
  } else {
    msg.member.voiceChannel.join()
        .then(conn => {
          broadcast.voice = conn;
          try {
            startPlaying(broadcast);
          } catch (err) {
            console.log(err);
            reply(msg, "Failed to start music stream!");
            command.trigger('stop', msg);
          }
        })
        .catch(err => {
          console.log(err);
          reply(msg, "Failed to join voice channel!");
        });
  }
}
// Start playing the first item in the queue of the broadcast.
function startPlaying(broadcast) {
  if (!broadcast || broadcast.isPlaying || broadcast.isLoading) {
    return;
  }
  if (broadcast.queue.length === 0) {
    command.trigger('stop', broadcast.current.request);
    broadcast.current.request.channel.send("`Queue is empty!`");
    return;
  }
  broadcast.isLoading = true;
  broadcast.skips = {};
  broadcast.current = broadcast.queue.splice(0, 1)[0];
  try {
    makeBroadcast(broadcast);
    broadcast.voice.playBroadcast(broadcast.broadcast);
  } catch (err) {
    console.log(err);
    endSong(broadcast);
    broadcast.isLoading = false;
  }
  broadcast.isPlaying = true;

  if (typeof broadcast.current.info !== 'undefined') {
    var embed = formatSongInfo(broadcast.current.info);
    embed.setTitle(
        "Now playing [" + broadcast.queue.length + " left in queue]");
    broadcast.current.request.channel.send(embed);
    broadcast.current.stream.on(
        'info', info => { broadcast.isLoading = false; });
  } else {
    if (special[broadcast.current.song]) {
      if (!special[broadcast.current.song].url) {
        broadcast.isLoading = false;
        var embed = new Discord.RichEmbed();
        embed.setTitle(
            "Now playing [" + broadcast.queue.length + " left in queue]");
        embed.setColor([50, 200, 255]);
        embed.setDescription(broadcast.current.song);
        broadcast.current.request.channel.send(embed);
      } else {
      ytdl.getInfo(
          special[broadcast.current.song].url, ytdlOpts, (err, info) => {
            if (err) {
              console.log(err);
              reply(
                  msg,
                  "Oops, something went wrong while getting info for this song!");
            } else {
              broadcast.isLoading = false;
              broadcast.current.info = info;
              var embed = formatSongInfo(broadcast.current.info);
              embed.setTitle(
                  "Now playing [" + broadcast.queue.length + " left in queue]");
              broadcast.current.request.channel.send(embed);
            }
          });
      }
    } else {
      broadcast.current.stream.on('info', info => {
        broadcast.isLoading = false;
        broadcast.current.info = info;
        var embed = formatSongInfo(broadcast.current.info);
        embed.setTitle(
            "Now playing [" + broadcast.queue.length + " left in queue]");
        broadcast.current.request.channel.send(embed);
      });
    }
  }
}
function makeBroadcast(broadcast) {
  if (special[broadcast.current.song]) {
    broadcast.broadcast.playFile(special[broadcast.current.song].file)
        .on('end', function() { endSong(broadcast); });
  } else {
    if (broadcast.current.info) {
      broadcast.current.stream = ytdl(broadcast.current.info.url, ytdlOpts);
    } else {
      broadcast.current.stream = ytdl(broadcast.current.song, ytdlOpts);
    }

    broadcast.broadcast.playStream(broadcast.current.stream)
        .on('end', function() { endSong(broadcast); });
  }
}
// Triggered when a song has finished playing.
function endSong(broadcast) {
  if (broadcast.isLoading) return;
  if (broadcast.isPlaying) skipSong(broadcast);
}
// Skip the current song, then attempt to play the next.
function skipSong(broadcast) {
  if (broadcast.broadcast) broadcast.broadcast.end();
  broadcast.isPlaying = false;
  startPlaying(broadcast);
}

function commandPlay(msg) {
  if (msg.member.voiceChannel === null) {
    reply(msg, "You aren't in a voice channel!");
  } else {
    var song = msg.content.replace(prefix + 'play', '');
    if (!song.startsWith(' ')) {
      reply(msg, "Please specify a song to play.");
      return;
    } else {
      song = song.replace(' ', '');
    }
    if (!broadcasts[msg.guild.id]) {
      reply(msg, "Loading " + song + "\nPlease wait...")
          .then(msg => msg.delete(10000));
      broadcasts[msg.guild.id] = {
        queue: [],
        skips: {},
        isPlaying: false,
        broadcast: client.createVoiceBroadcast()
      };
      enqueueSong(broadcasts[msg.guild.id], song, msg);
    } else {
      if (special[song]) {
        var embed = new Discord.RichEmbed();
        embed.setTitle(
            "Enqueuing " + song + " [" +
            (broadcasts[msg.guild.id].queue.length + 1) + " in queue]");
        embed.setColor([50, 200, 255]);
        msg.channel.send(mention(msg), embed);
        enqueueSong(broadcasts[msg.guild.id], song, msg);
      } else {
        var loadingMsg;
        reply(msg, "Loading " + song + "\nPlease wait...")
            .then(msg => loadingMsg = msg);
        ytdl.getInfo(song, ytdlOpts, (err, info) => {
          if (err) {
            reply(
                msg,
                "Oops, something went wrong while searching for that song!");
            console.log(err);
          } else if (info._duration_raw == 0) {
            reply(msg, "Sorry, but I can't play live streams currently.");
          } else {
            if (broadcasts[msg.guild.id].isPlaying) {
              var embed = formatSongInfo(info);
              embed.setTitle(
                  "Enqueuing " + song + " [" +
                  (broadcasts[msg.guild.id].queue.length + 1) + " in queue]");
              msg.channel.send(mention(msg), embed);
              enqueueSong(broadcasts[msg.guild.id], song, msg, info);
            }
          }
          if (loadingMsg) loadingMsg.delete();
        });
      }
    }
  }
}
function commandLeave(msg) {
  var shouldReply = true;
  if (!broadcasts[msg.guild.id] ||
      (broadcasts[msg.guild.id].queue.length === 0 &&
       broadcasts[msg.guild.id].current)) {
    shouldReply = false;
  }
  msg.guild.fetchMember(client.user).then(me => {
    if (typeof me.voiceChannel !== 'undefined') {
      me.voiceChannel.leave();
      if (shouldReply) reply(msg, "Goodbye!");
    } else {
      if (shouldReply) reply(msg, "I'm not playing anything.");
    }
  });
  delete broadcasts[msg.guild.id];
}
function commandSkip(msg) {
  if (!broadcasts[msg.guild.id]) {
    reply(msg, "I'm not playing anything, I can't skip nothing!");
  } else {
    reply(msg, "Skipping current song...");
    skipSong(broadcasts[msg.guild.id]);
  }
}
function commandQueue(msg) {
  if (!broadcasts[msg.guild.id]) {
    reply(
        msg, "I'm not playing anything. Use \"" + prefix +
            "play Kokomo\" to start playing something!");
  } else {
    var emebed;
    if (broadcasts[msg.guild.id].current) {
      if (broadcasts[msg.guild.id].current.info) {
        embed = formatSongInfo(broadcasts[msg.guild.id].current.info);
      } else {
        embed = new Discord.RichEmbed();
        embed.setColor([50, 200, 255]);
        embed.setDescription(broadcasts[msg.guild.id].current.song);
      }
      embed.setTitle("Current Song Queue");
    } else {
      embed = new Discord.RichEmbed();
    }
    if (broadcasts[msg.guild.id].queue.length > 0) {
      embed.addField(
          "Queue", broadcasts[msg.guild.id]
                       .queue
                       .map(function(obj, index) {
                         if (obj.info) {
                           return (index + 1) + ") " + obj.info.title;
                         } else {
                           return (index + 1) + ") " + obj.song;
                         }
                       })
                       .join('\n'));
    }
    msg.channel.send(embed);
  }
}
function commandRemove(msg) {
  if (!broadcasts[msg.guild.id] ||
      broadcasts[msg.guild.id].queue.length === 0) {
    reply(
        msg,
        "The queue appears to be empty.\nI can't remove nothing from nothing!");
  } else {
    var indexString = msg.content.replace(prefix + 'remove', '')
                          .replace(prefix + 'dequeue', '');
    if (!indexString.startsWith(' ')) {
      reply(
          msg,
          "You must specify the index of the song to dequeue.\nYou can view the queue with \"" +
              prefix + "queue\".");
    } else {
      var index = Number(indexString.replace(' ', ''));
      if (typeof index !== 'number' || index <= 0 ||
          index > broadcasts[msg.guild.id].queue.length) {
        reply(msg, "That is not a valid index!");
      } else {
        var removed = broadcasts[msg.guild.id].queue.splice(index - 1, 1)[0];
        reply(msg, "Dequeued #" + index + ": " + removed.info.title);
      }
    }
  }
}
function commandLyrics(msg) {
  var song = msg.content.replace(myPrefix + "lyrics", '');
  if (song.length <= 1) {
    reply(msg, "Please specify a song.");
    return;
  }
  song = song.replace(' ', '');
  var thisReq = geniusRequest;
  thisReq.path = "/search?q=" + encodeURIComponent(song);
  var req = https.request(thisReq, function(response) {
    var content = '';
    response.on('data', function(chunk) { content += chunk; });
    response.on('end', function() {
      if (response.statusCode == 200) {
        msg.channel.send("Search successful").then(msg => {
          msg.delete(2000);
        });
        var parsed = JSON.parse(content);
        if (parsed.response.hits.length === 0) {
          reply(msg, "Failed to find lyrics. No matches found.");
        } else {
          reqLyricsURL(msg, parsed.response.hits[0].result.id);
        }
      } else {
        msg.channel.send(
            response.statusCode + "```json\n" +
            JSON.stringify(response.headers, null, 2) + "```\n```html\n" +
            content + "\n```");
      }
    });
    response.on('close', function() {
      common.LOG("Genius request closed! " + content.length, "Music");
    });
    response.on('error', function() {
      common.LOG("Genius request errored! " + content.length, "Music");
    });
  });
  req.end();
  req.on('error', function(e) { common.ERROR(e, "Music"); });
}
function reqLyricsURL(msg, id) {
  var thisReq = geniusRequest;
  thisReq.path = "/songs/" + id + "?text_format=plain";
  var req = https.request(thisReq, function(response) {
    var content = '';
    response.on('data', function(chunk) { content += chunk; });
    response.on('end', function() {
      if (response.statusCode == 200) {
        msg.channel.send("Lyrics url fetched.").then(msg => {
          msg.delete(2000);
        });
        var parsed = JSON.parse(content);
        fetchLyricsPage(
            msg, parsed.response.song.url, parsed.response.song.full_title,
            parsed.response.song.song_art_image_thumbnail_url);
      } else {
        msg.channel.send(
            response.statusCode + "```json\n" +
            JSON.stringify(response.headers, null, 2) + "```\n```html\n" +
            content + "\n```");
      }
    });
    response.on('close', function() {
      common.LOG("Genius request closed! " + content.length, "Music");
    });
    response.on('error', function() {
      common.LOG("Genius request errored! " + content.length, "Music");
    });
  });
  req.end();
  req.on('error', function(e) { common.ERROR(e, "Music"); });
}
function fetchLyricsPage(msg, url, title, thumb) {
  var URL = url.match(/https:\/\/([^\/]*)(.*)/);
  const thisReq = {hostname: URL[1], path: URL[2], method: "GET"};
  var req = https.request(thisReq, function(response) {
    var content = '';
    response.on('data', function(chunk) { content += chunk; });
    response.on('end', function() {
      if (response.statusCode == 200) {
        msg.channel.send("Lyrics page fetched.").then(msg => {
          msg.delete(2000);
        });
        stripLyrics(msg, content, title, url, thumb);
      } else {
        msg.channel.send(
            response.statusCode + "```json\n" +
            JSON.stringify(response.headers, null, 2) + "```\n```html\n" +
            content + "\n```");
      }
    });
    response.on('close', function() {
      common.LOG("Genius request closed! " + content.length, "Music");
    });
    response.on('error', function() {
      common.LOG("Genius request errored! " + content.length, "Music");
    });
  });
  req.end();
  req.on('error', function(e) { common.ERROR(e, "Music"); });
}
function stripLyrics(msg, content, title, url, thumb) {
  try {
    var body = content.match(/<!--sse-->([\s\S]*?)<!--\/sse-->/gm)[1];
    var lyrics = body.match(/^([^<]*)<|>([^<]*)<|>([^<]*)$/g)
                     .slice(1)
                     .join('')
                     .replace(/<>|^\s*|^>\s*/gm, '');
    var embed = new Discord.RichEmbed();
    if (title) embed.setTitle(title);
    if (url) {
      embed.setFooter(url);
      embed.setURL(url);
    }
    if (thumb) {
      embed.setThumbnail(thumb);
    }
    for (var i = 0; i < 25 && lyrics.length > i * 1024; i++) {
      embed.addField('\u200B', lyrics.substr(i * 1024, 1024), true);
    }
    embed.setColor([0, 255, 255]);
    msg.channel.send(embed);
  } catch(err) {
    console.log(err);
    msg.channel.send("FAILED to parse lyrics: " + err.message);
  }
}