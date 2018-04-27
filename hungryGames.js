const fs = require('fs');
const jimp = require('jimp');

let initialized = false;

const saveFile = 'hg.json';
const eventFile = 'hgEvents.json';
const messageFile = 'hgMessages.json';
const battleFile = 'hgBattles.json';

const fistLeft = 'fist_left.png';
const fistRight = 'fist_right.png';
const fistBoth = 'fist_both.png';

// The size of the icon to show for each event.
const iconSize = 64;
// The size of the icon to show for each battle event.
const battleIconSize = 32;
// The size of the user icons to show for the victors.
const victorIconSize = 80;
// The size of the icon to request from discord.
const fetchSize = 64;
// Pixels between each icon
const iconGap = 4;

// Role that a user must have in order to perform any commands.
const roleName = 'HG Creator';

// Number of events to show on a single page of events.
const numEventsPerPage = 10;

// Maximum amount of time to wait for reactions to a message.
const maxReactAwaitTime = 15 * 1000 * 60; // 15 Minutes

// Default options for a game.
const defaultOptions = {
  bloodbathDeathRate: {
    value: 'normal',
    values: ['verylow', 'low', 'normal', 'high', 'veryhigh'],
    comment:
        'Controls how many people die in the bloodbath. Can be ["verylow", "low", "normal", "high", "veryhigh"].',
  },
  playerDeathRate: {
    value: 'normal',
    values: ['verylow', 'low', 'normal', 'high', 'veryhigh'],
    comment:
        'Controls how many people die each day. Can be ["verylow", "low", "normal", "high", "veryhigh"].',
  },
  arenaEvents: {
    value: true,
    comment:
        'Are arena events possible. (Events like wolf mutts, or a volcano erupting.)',
  },
  resurrection: {
    value: false,
    comment: 'Can users be resurrected and placed back into the arena.',
  },
  includeBots: {
    value: false,
    comment:
        'Should bots be included in the games. If this is false, bots cannot be added manually.',
  },
  allowNoVictors: {
    value: true,
    comment:
        'Should it be possible to end a game without any winners. If true, it is possible for every player to die, causing the game to end with everyone dead. False forces at least one winner.',
  },
  bleedDays: {
    value: 2,
    comment: 'Number of days a user can bleed before they can die.',
  },
  battleHealth:
      {value: 5, comment: 'The amount of health each user gets for a battle.'},
  teamSize: {
    value: 0,
    comment: 'Maximum size of teams when automatically forming teams.',
  },
  teammatesCollaborate: {
    value: true,
    comment:
        'Will teammates work together. If false, teammates can kill eachother, and there will only be 1 victor. If true, teammates cannot kill eachother, and the game ends when one TEAM is remaining, not one player.',
  },
  mentionVictor: {
    value: true,
    comment:
        'Should the victor of the game (can be team), be tagged/mentioned so they get notified?',
  },
  mentionAll: {
    value: false,
    comment:
        'Should a user be mentioned every time something happens to them in the game?',
  },
  mentionEveryoneAtStart: {
    value: false,
    comment: 'Should @everyone be mentioned when the game is started?',
  },
  delayEvents: {
    value: 3500,
    time: true,
    comment: 'Delay in milliseconds between each event being printed.',
  },
  delayDays: {
    value: 7000,
    time: true,
    comment: 'Delay in milliseconds between each day being printed.',
  },
  probabilityOfResurrect: {
    value: 0.33,
    percent: true,
    comment:
        'Probability each day that a dead player can be put back into the game.',
  },
  probabilityOfArenaEvent: {
    value: 0.25,
    percent: true,
    comment: 'Probability each day that an arena event will happen.',
  },
  probabilityOfBleedToDeath: {
    value: 0.5,
    percent: true,
    comment:
        'Probability that after bleedDays a player will die. If they don\'t die, they will heal back to normal.',
  },
  probabilityOfBattle: {
    value: 0.05,
    percent: true,
    comment:
        'Probability of an event being replaced by a battle between two players.',
  },
};

// If a larger percentage of people die in one day than this value, then show a
// relevant message.
const lotsOfDeathRate = 0.75;
// If a lower percentage of people die in one day than this value, then show a
// relevant message.
const littleDeathRate = 0.15;

// Default color to choose for embedded messages.
const defaultColor = [200, 125, 0];

const emoji = {
  x: '❌',
  white_check_mark: '✅',
  0: '\u0030\u20E3',
  1: '\u0031\u20E3',
  2: '\u0032\u20E3',
  3: '\u0033\u20E3',
  4: '\u0034\u20E3',
  5: '\u0035\u20E3',
  6: '\u0036\u20E3',
  7: '\u0037\u20E3',
  8: '\u0038\u20E3',
  9: '\u0039\u20E3',
  10: '\u{1F51F}',
  arrow_up: '⬆',
  arrow_down: '⬇',
  arrow_double_up: '⏫',
  arrow_double_down: '⏬',
  arrow_left: '⬅',
  arrow_right: '➡',
  arrow_double_left: '⏪',
  arrow_double_right: '⏩',
  arrows_counterclockwise: '🔄',
  crossed_swords: '⚔',
  shield: '🛡',
  heart: '❤',
  yellow_heart: '💛',
  broken_heart: '💔',
  skull: '💀',
  negative_squared_cross_mark: '❎',
  ballot_box_with_check: '☑',
  skull_crossbones: '☠',
  slight_smile: '🙂',
  question: '⚔',
  red_circle: '🔴',
  trophy: '🏆',
};

const alph = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Probability of each amount of people being chosen for an event.
// Must total to 1.0
const multiEventUserDistribution = {
  1: 0.66,
  2: 0.259,
  3: 0.03,
  4: 0.02,
  5: 0.01,
  6: 0.015,
  7: 0.005,
  8: 0.0005,
  9: 0.0005,
};

const deathRateWeights = {
  verylow: {kill: 1, nothing: 4},
  low: {kill: 1, nothing: 2},
  normal: {kill: 3, nothing: 5},
  high: {kill: 1, nothing: 1},
  veryhigh: {kill: 2, nothing: 1},
};

let prefix;
let Discord;
let client;
let command;
let common;
let myPrefix;
let helpMessage;
// All currently tracked games.
let games = {};
// All messages to show for games.
let messages = {};
// All attacks and outcomes for battles.
let battles = {};
// All intervals for printing events.
let intervals = {};
// Storage of battle messages to edit the content of on the next update.
let battleMessage = {};
// Default parsed bloodbath events.
let defaultBloodbathEvents = [];
// Default parsed player events.
let defaultPlayerEvents = [];
// Default parsed arena events.
let defaultArenaEvents = [];
// Messages that the user sent with a new event to add, for storage while
// getting the rest of the information about the event.
let newEventMessages = {};
// Messages I have sent showing current options.
let optionMessages = {};

// Read saved game data from disk.
fs.readFile(saveFile, function(err, data) {
  if (err) return;
  games = JSON.parse(data);
  if (!games) games = {};
});

/**
 * Parse all default events from file.
 */
function updateEvents() {
  fs.readFile(eventFile, function(err, data) {
    if (err) return;
    try {
      let parsed = JSON.parse(data);
      if (parsed) {
        defaultBloodbathEvents = parsed['bloodbath'];
        defaultPlayerEvents = parsed['player'];
        defaultArenaEvents = parsed['arena'];
      }
    } catch (err) {
      console.log(err);
    }
  });
}
updateEvents();
fs.watchFile(eventFile, function(curr, prev) {
  if (curr.mtime == prev.mtime) return;
  if (common && common.log) {
    common.log('Re-reading default events from file', 'HG');
  } else {
    console.log('HG: Re-reading default events from file');
  }
  updateEvents();
});

/**
 * Parse all messages from file.
 */
function updateMessages() {
  fs.readFile(messageFile, function(err, data) {
    if (err) return;
    try {
      let parsed = JSON.parse(data);
      if (parsed) {
        messages = parsed;
      }
    } catch (err) {
      console.log(err);
    }
  });
}
updateMessages();
fs.watchFile(messageFile, function(curr, prev) {
  if (curr.mtime == prev.mtime) return;
  if (common && common.log) {
    common.log('Re-reading messages from file', 'HG');
  } else {
    console.log('HG: Re-reading messages from file');
  }
  updateMessages();
});

/**
 * Parse all battles from file.
 */
function updateBattles() {
  fs.readFile(battleFile, function(err, data) {
    if (err) return;
    try {
      let parsed = JSON.parse(data);
      if (parsed) {
        battles = parsed;
      }
    } catch (err) {
      console.log(err);
    }
  });
}
updateBattles();
fs.watchFile(battleFile, function(curr, prev) {
  if (curr.mtime == prev.mtime) return;
  if (common && common.log) {
    common.log('Re-reading battles from file', 'HG');
  } else {
    console.log('HG: Re-reading battles from file');
  }
  updateBattles();
});

// Reply to help on a server.
const helpmessagereply = 'I sent you a DM with commands!';
// Reply if unable to send message via DM.
const blockedmessage =
    'I couldn\'t send you a message, you probably blocked me :(';
const helpObject = {
  title: 'Hungry Games!',
  description: 'To use any of these commands you must have the "' + roleName +
      '" role.',
  sections: [
    {
      title: 'Game Settings',
      rows: [
        'create // This will create a game with default settings if it doesn\'t exist already.',
        'options \'option name\' \'value\' // List options if no name, or change the option if you give a name.',
        'reset \'all/current/events/options/teams\' // Delete data about the Games. Don\'t choose an option for more info.',
      ],
    },
    {
      title: 'Player Settings',
      rows: [
        'players // This will list all players I currently care about.',
        'exclude \'mention\' // Prevent someone from being added to the next game.',
        'include \'mention\' // Add a person back into the next game.',
      ],
    },
    {
      title: 'Team Settings',
      rows: [
        'teams swap \'mention\' \'mention\' // This will swap two players to the other team.',
        'teams move \'mention\' \'id/mention\' // This will move the first player, to another team. (Ignores teamSize option)',
        'teams rename \'id/mention\' \'name...\' // Rename a team. Specify its id, or mention someone on a team.',
        'teams randomize // Randomize who is on what team.',
        'teams reset // Delete all teams and start over.',
      ],
    },
    {
      title: 'Events',
      rows: [
        'events // This will list all custom events that could happen in the game.',
        'debugevents // This will let you download all of the events and their data.',
        'events add \'message\' // Begins process of adding a custom event.',
        'events remove \'number\' // Remove a custom event. The number is the number shown in the list of events.',
      ],
    },
    {
      title: 'Time Control',
      rows: [
        'start // This will start a game with your settings.',
        'end // This will end a game early.',
        'autoplay // Automatically continue to the next day after a day is over.',
        'pause // Stop autoplay at the end of the day.',
        'next // Simulate the next day of the Games!',
      ],
    },
  ],
};
exports.helpMessage = 'Module loading...';
const webURL = 'https://www.campbellcrowley.com/spikeybot';

/**
 * Set all help messages once we know what prefix to use.
 */
function setupHelp() {
  exports.helpMessage = '`' + myPrefix + 'help` for Hungry Games help.';
  // Format help message into rich embed.
  let tmpHelp = new Discord.MessageEmbed();
  tmpHelp.setTitle(helpObject.title);
  tmpHelp.setURL(webURL + '#' + encodeURIComponent(helpObject.title));
  tmpHelp.setDescription(helpObject.description);
  helpObject.sections.forEach(function(obj) {
    let titleID = encodeURIComponent(obj.title);
    let titleURL = '[web](' + webURL + '#' + titleID + ')';
    tmpHelp.addField(
        obj.title, titleURL + '```js\n' +
            obj.rows
                .map(function(row) {
                  return myPrefix + row.replaceAll('{prefix}', myPrefix);
                })
                .join('\n') +
            '\n```',
        true);
  });
  helpMessage = tmpHelp;
}

/**
 * Initialize this submodule.
 *
 * @param {string} prefix_ The global prefix for this bot.
 * @param {Discord} Discord_ The Discord object for the API library.
 * @param {Discord.Client} client_ The client that represents this bot.
 * @param {Command} command_ The command instance in which to register command
 * listeners.
 * @param {Object} common_ Object storing common functions.
 */
exports.begin = function(prefix_, Discord_, client_, command_, common_) {
  prefix = prefix_;
  myPrefix = prefix + 'hg ';
  Discord = Discord_;
  client = client_;
  command = command_;
  common = common_;

  command.on('hg', function(msg) {
    try {
      handleCommand(msg);
    } catch (err) {
      common.error('An error occured while perfoming command.', 'HG');
      console.log(err);
      reply(msg, 'Oopsies! Something is broken!');
    }
  });

  setupHelp();

  client.on('messageUpdate', handleMessageEdit);

  initialized = true;
  common.log('HungryGames Init', 'HG');

  for (let key in games) {
    if (games[key].options) {
      for (let opt in defaultOptions) {
        if (typeof games[key].options[opt] === 'undefined') {
          games[key].options[opt] = defaultOptions[opt].value;
        }
      }
      for (let opt in games[key].options) {
        if (typeof defaultOptions[opt] === 'undefined') {
          delete games[key].options[opt];
        }
      }
    }

    if (games[key].currentGame && games[key].currentGame.day.state != 0 &&
        games[key].currentGame.inProgress && games[key].channel &&
        games[key].msg) {
      common.log(
          'Resuming game: ' + games[key].channel + ' ' + games[key].msg, 'HG');
      let msg =
          client.channels.get(games[key].channel)
              .fetchMessage(games[key].msg)
              .then(function(key) {
                return function(msg) {
                  nextDay(msg, key);
                };
              }(key))
              .catch((err) => {
                common.error('Failed to automatically resume games.', 'HG');
                console.log(err);
              });
    }
  }
};

/**
 * Shutdown and disable this submodule. Removes all event listeners.
 */
exports.end = function() {
  if (!initialized) return;
  initialized = false;
  command.deleteEvent('hg');
  client.removeListener('messageUpdate', handleMessageEdit);
  delete command;
  delete Discord;
  delete client;
  delete common;
  process.removeListener('exit', exit);
  process.removeListener('SIGINT', sigint);
  process.removeListener('SIGHUP', sigint);
  process.removeListener('SIGTERM', sigint);
  process.removeListener('unhandledRejection', unhandledRejection);
};

/**
 * Hanlder for when the create event message is edited and we should update our message with the updated event.
 *
 * @param {Discord.Message} oldMsg The message before being edited.
 * @param {Discord.Message} newMsg The message after being edited.
 */
function handleMessageEdit(oldMsg, newMsg) {
  if (newEventMessages[oldMsg.id]) {
    newMsg.text = newMsg.content.split(' ').slice(2).join(' ');
    newMsg.myResponse = oldMsg.myResponse;
    newEventMessages[oldMsg.id] = newMsg;
    updateEventPreview(newMsg);
  }
}

/**
 * Handle a command from a user and pass into relevant functions.
 *
 * @param {Discord.Message} msg Message that triggered command.
 */
function handleCommand(msg) {
  if (msg.content == myPrefix + 'help') {
    help(msg);
    return;
  } else if (msg.content.split(' ')[1] == 'makemewin') {
    reply(
        msg, 'Your probability of winning has increased by ' + nothing() + '!');
    return;
  } else if (msg.content.split(' ')[1] == 'makemelose') {
    reply(
        msg, 'Your probability of losing has increased by ' + nothing() + '!');
    return;
  } else if (msg.guild === null) {
    reply(msg, 'This command only works in servers, sorry!');
    return;
  }
  checkPerms(msg, function(msg, id) {
    let splitText = msg.content.split(' ').slice(1);
    if (!splitText[0]) {
      reply(msg, 'That isn\'t a command I understand.');
      return;
    }
    let command = splitText[0].toLowerCase();
    msg.text = splitText.slice(1).join(' ');

    if (games[id]) {
      games[id].channel = msg.channel.id;
      games[id].author = msg.author.id;
    }
    switch (command) {
      case 'create':
      case 'c':
      case 'new':
        createGame(msg, id);
        break;
      case 'reset':
        resetGame(msg, id);
        break;
      case 'debug':
        showGameInfo(msg, id);
        break;
      case 'debugevents':
        showGameEvents(msg, id);
        break;
      case 'exclude':
      case 'remove':
      case 'exc':
      case 'ex':
        excludeUser(msg, id);
        break;
      case 'include':
      case 'add':
      case 'inc':
      case 'in':
        includeUser(msg, id);
        break;
      case 'options':
      case 'option':
      case 'opt':
      case 'opts':
        toggleOpt(msg, id);
        break;
      case 'events':
      case 'event':
        if (!splitText[1]) {
          listEvents(msg, id, 0);
        } else {
          switch (splitText[1].toLowerCase()) {
            case 'add':
            case 'create':
              createEvent(msg, id);
              break;
            case 'remove':
            case 'delete':
              removeEvent(msg, id);
              break;
            default:
              reply(
                  msg,
                  'I\'m sorry, but I don\'t know how to do that to an event.');
              break;
          }
        }
        break;
      case 'players':
      case 'player':
        listPlayers(msg, id);
        break;
      case 'start':
      case 's':
        startGame(msg, id);
        break;
      case 'pause':
      case 'stop':
        pauseAutoplay(msg, id);
        break;
      case 'autoplay':
      case 'auto':
      case 'resume':
      case 'play':
      case 'go':
        startAutoplay(msg, id);
        break;
      case 'next':
      case 'nextday':
        try {
          nextDay(msg, id);
        } catch (err) {
          console.log(err);
        }
        break;
      case 'end':
      case 'abort':
        endGame(msg, id);
        break;
      case 'save':
        exports.save('async');
        msg.channel.send('`Saving all data...`');
        break;
      case 'team':
      case 'teams':
      case 't':
        editTeam(msg, id);
        break;
      case 'help':
        help(msg, id);
        break;
      default:
        reply(
            msg, 'Oh noes! I can\'t understand that! "' + myPrefix +
                'help" for help.');
        break;
    }
  });
}

/**
 * Creates formatted string for mentioning the author of msg.
 *
 * @param {Discord.Message} msg Message to format a mention for the author of.
 * @return {string} Formatted mention string.
 */
function mention(msg) {
  return `<@${msg.author.id}>`;
}
/**
 * Replies to the author and channel of msg with the given message.
 *
 * @param {Discord.Message} msg Message to reply to.
 * @param {string} text The main body of the message.
 * @param {string} post The footer of the message.
 * @return {Promise} Promise of Discord.Message that we attempted to send.
 */
function reply(msg, text, post) {
  post = post || '';
  return msg.channel.send(`${mention(msg)}\n\`\`\`\n${text}\n\`\`\`${post}`);
}
/**
 * Check if author of msg has the required role to run commands.
 *
 * @param {Discord.Message} msg Message of the author to check for the role.
 * @return {boolean} If the message author has the necessary role.
 */
function checkForRole(msg) {
  return msg.member.roles.exists('name', roleName);
}

/**
 * Handler for a Hungry Games command.
 *
 * @callback hgCommandHandler
 * @param {Discord.Message} msg The message sent in Discord that triggered this
 * command.
 * @param {string} id The id of the guild this command was run on for
 * convinience.
 */

/**
 * Check if author of msg has permissions, then trigger callback with guild id.
 *
 * @param {Discord.Message} msg Message of the user to ensure has proper
 * permissions.
 * @param {hgCommandHandler} cb Callback to call if user has proper permissions
 * to run command.
 */
function checkPerms(msg, cb) {
  if (checkForRole(msg)) {
    const id = msg.guild.id;
    cb(msg, id);
  } else {
    reply(
        msg, 'Ha! Nice try! I don\'t listen to people without the "' +
            roleName + '" role!');
  }
}

/**
 * Serializable container for data pertaining to a single user.
 *
 * @param {string} id The id of the user this object is representing.
 * @param {string} username The name of the user to show in the game.
 * @param {string} avatarURL URL to avatar to show for the user in the game.
 * @property {string} id The id of the User this Player represents.
 * @property {string} name The name of this Player.
 * @property {string} avatarURL The URL to the discord avatar of the User.
 * @property {boolean} living Is the player still alive.
 * @property {number} bleeding How many days has the player been wounded.
 * @property {number} rank The current rank of the player in the game.
 * @property {string} state The current player state (normal, wounded, dead,
 * zombie).
 * @property {number} kills The number of players this player has caused to die.
 */
function Player(id, username, avatarURL) {
  // User id.
  this.id = id;
  // Username.
  this.name = username;
  // URL TO user's current avatar.
  this.avatarURL = avatarURL;
  // If this user is still alive.
  this.living = true;
  // If this user is will die at the end of the day.
  this.bleeding = 0;
  // The rank at which this user died.
  this.rank = 1;
  // Health state.
  this.state = 'normal';
  // Number of kills this user has for the game.
  this.kills = 0;
}

/**
 * Serializable container for data about a team in a game.
 *
 * @param {string|number} id The id unique to a guild for this team.
 * @param {string} name The name of this team.
 * @param {string[]} players Array of player ids on the team.
 * @property {string} id The unique id unique to a guild for this team.
 * @property {string} name The name of this team.
 * @property {string[]} players Array of player ids on the team.
 * @property {number} rank The current team rank.
 * @property {number} numAlive The number of players on the team still alive.
 */
function Team(id, name, players) {
  // The identifier for this team unique to the server.
  this.id = id;
  // The name of the team to show users.
  this.name = name;
  // The array of player ids on this team.
  this.players = players;
  // The final rank this team placed once the final member has died.
  this.rank = 1;
  // Number of players still alive on this team.
  this.numAlive = players.length;
}
/**
 * Event that can happen in a game.
 *
 * @param {string} message The message to show.
 * @param {number} [numVictim=0] The number of victims in this event.
 * @param {number} [numAttacker=0] The number of attackers in this event.
 * @param {string} [victimOutcome='nothing'] The outcome of the victims from
 * this event.
 * @param {string} [attackerOutcome='notnorth'] The outcome of the attackers
 * from this event.
 * @param {boolean} [victimKiller=false] Do the victims kill anyone in this
 * event. Used for calculating kill count.
 * @param {boolean} [attackerKiller=false] Do the attackers kill anyone in this
 * event. Used for calculating kill count.
 * @param {boolean} battle Is this event a battle?
 * @param {number} [state=0] State of event if there are multiple attacks before
 * the event.
 * @param {Event[]} attacks Array of attacks that take place before the event.
 * @property {string} message The message to show.
 * @property {{count: number, outcome: string, killer: boolean}} victim
 * Information about the victims in this event.
 * @property {{count: number, outcome: string, killer: boolean}} attacker
 * Information about the attackers in this event.
 * @property {boolean} battle Does this event a battle.
 * @property {number} state The current state of printing the battle messages.
 * @property {Event[]} attacks The attacks in a battle to show before the
 * message.
 */
function Event(
    message, numVictim = 0, numAttacker = 0, victimOutcome = 'nothing',
    attackerOutcome = 'nothing', victimKiller = false, attackerKiller = false,
    battle = false, state = 0, attacks = []) {
  this.message = message;
  this.victim = {
    count: numVictim,
    outcome: victimOutcome,
    killer: victimKiller,
  };
  this.attacker = {
    count: numAttacker,
    outcome: attackerOutcome,
    killer: attackerKiller,
  };
  this.battle = battle;
  this.state = state;
  this.attacks = attacks;
}

/**
 * Create a Player from a given Disord.User.
 *
 * @param {Discord.User} user User to make a Player from.
 * @return {Player} Player object created from User.
 */
function makePlayer(user) {
  return new Player(
      user.id, user.username.replaceAll('`', '\\`'),
      user.displayAvatarURL({format: 'png'}));
}

/**
 * Delay a message to send at the given time in milliseconds since epoch.
 *
 * @param {Discord.TextChannel} channel The channel to send the message in.
 * @param {Discord.StringResolvable|Discord.MessageOptions|Discord.MessageEmbed|Discord.MessageAttachment|Discord.MessageAttachment[]}
 * one The message to send.
 * @param {Discord.StringResolvable|Discord.MessageOptions|Discord.MessageEmbed|Discord.MessageAttachment|Discord.MessageAttachment[]}
 * two The message to send.
 * @param {number} time The time to send the message in milliseconds since
 * epoch.
 */
function sendAtTime(channel, one, two, time) {
  if (time <= Date.now()) {
    channel.send(one, two);
  } else {
    client.setTimeout(function() {
      sendAtTime(channel, one, two, time);
    }, time - Date.now());
  }
}

// Create //
/**
 * Create a Hungry Games for a guild.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 * @param {boolean} [silent=false] Should we suppress replies to message.
 */
function createGame(msg, id, silent) {
  if (games[id] && games[id].currentGame && games[id].currentGame.inProgress) {
    if (!silent) {
      reply(
          msg,
          'This server already has a Hungry Games in progress. If you wish to create a new one, you must end the current one first with "hgend".');
    }
    return;
  } else if (games[id] && games[id].currentGame) {
    if (!silent) {
      reply(msg, 'Creating a new game with settings from the last game.');
    }
    games[id].currentGame.ended = false;
    games[id].currentGame.day = {num: -1, state: 0, events: []};
    games[id].currentGame.includedUsers = getAllPlayers(
        msg.guild.members, games[id].excludedUsers,
        games[id].options.includeBots);
    games[id].currentGame.numAlive = games[id].currentGame.includedUsers.length;
  } else if (games[id]) {
    if (!silent) reply(msg, 'Creating a new game with default settings.');
    games[id].currentGame = {
      name: msg.guild.name + '\'s Hungry Games',
      inProgress: false,
      includedUsers: getAllPlayers(
          msg.guild.members, games[id].excludedUsers,
          games[id].options.includeBots),
      ended: false,
      day: {num: -1, state: 0, events: []},
    };
    games[id].currentGame.numAlive = games[id].currentGame.includedUsers.length;
  } else {
    games[id] = {
      excludedUsers: [],
      customEvents: {bloodbath: [], player: [], arena: []},
      currentGame: {
        name: msg.guild.name + '\'s Hungry Games',
        inProgress: false,
        includedUsers: getAllPlayers(msg.guild.members, [], false),
        teams: [],
        ended: false,
        day: {num: -1, state: 0, events: []},
      },
      autoPlay: false,
      previousMessage: 0,
    };
    games[id].currentGame.numAlive = games[id].currentGame.includedUsers.length;
    const optKeys = Object.keys(defaultOptions);
    games[id].options = {};
    for (let i in optKeys) {
      games[id].options[optKeys[i]] = defaultOptions[optKeys[i]].value;
    }
    if (!silent) {
reply(
          msg,
          'Created a Hungry Games with default settings and all members included.');
}
  }
  formTeams(id);
}
/**
 * Form an array of Player objects based on guild members, excluded members, and
 * whether to include bots.
 *
 * @param {Discord.Collection<Discord.GuildMember>} members All members in
 * guild.
 * @param {string[]} excluded Array of ids of users that should not be included
 * in the games.
 * @param {boolean} bots Should bots be included in the games.
 * @return {Player[]} Array of players to include in the games.
 */
function getAllPlayers(members, excluded, bots) {
  let finalMembers = [];
  if (!bots || excluded instanceof Array) {
    finalMembers = members.filter(function(obj) {
      return !(
          (!bots && obj.user.bot) ||
          (excluded && excluded.includes(obj.user.id)));
    });
  }
  if (finalMembers.length == 0) finalMembers = members.slice();
  return finalMembers.map((obj) => {
    return new Player(
        obj.id, obj.user.username, obj.user.displayAvatarURL({format: 'png'}));
  });
}
/**
 * Add users to teams, and remove excluded users from teams. Deletes empty
 * teams, and adds teams once all teams have teamSize of players.
 *
 * @param {string} id Id of guild where this was triggered from.
 */
function formTeams(id) {
  let game = games[id];
  if (game.options.teamSize < 0) game.options.teamSize = 0;
  if (game.options.teamSize == 0) {
    game.currentGame.teams = [];
    return;
  }

  let teamSize = game.options.teamSize;
  let numTeams = Math.ceil(game.currentGame.includedUsers.length / teamSize);
  // If teams already exist, update them. Otherwise, create new teams.
  if (game.currentGame.teams && game.currentGame.teams.length > 0) {
    game.currentGame.teams.sort(function(a, b) {
      return a.id - b.id;
    });
    let notIncluded = game.currentGame.includedUsers.slice(0);
    // Remove players from teams if they are no longer included in game.
    for (let i = 0; i < game.currentGame.teams.length; i++) {
      let team = game.currentGame.teams[i];
      team.id = i;
      for (let j = 0; j < team.players.length; j++) {
        if (game.currentGame.includedUsers.findIndex(function(obj) {
              return obj.id == team.players[j];
            }) < 0) {
          team.players.splice(j, 1);
          j--;
        } else {
          notIncluded.splice(
              notIncluded.findIndex(function(obj) {
                return obj.id == team.players[j];
              }),
              1);
        }
      }
      if (team.players.length == 0) {
        game.currentGame.teams.splice(i, 1);
        i--;
      }
    }
    // Add players who are not on a team, to a team.
    for (let i = 0; i < notIncluded.length; i++) {
      let found = false;
      for (let j = 0; j < game.currentGame.teams.length; j++) {
        let team = game.currentGame.teams[j];
        if (team.players.length < teamSize) {
          team.players.push(notIncluded[i].id);
          found = true;
          break;
        }
      }
      if (found) continue;
      // Add a team if all existing teams are full.
      game.currentGame.teams[game.currentGame.teams.length] = new Team(
          game.currentGame.teams.length,
          'Team ' + (game.currentGame.teams.length + 1), [notIncluded[i].id]);
    }
  } else {
    // Create all teams for players.
    game.currentGame.teams = [];
    for (let i = 0; i < numTeams; i++) {
      game.currentGame.teams[i] = new Team(
          i, 'Team ' + (i + 1),
          game.currentGame.includedUsers
              .slice(i * teamSize, i * teamSize + teamSize)
              .map(function(obj) {
                return obj.id;
              }));
    }
  }
  // Reset team data.
  game.currentGame.teams.forEach(function(obj) {
    obj.numAlive = obj.players.length;
    obj.rank = 1;
  });
}
/**
 * Reset data that the user specifies.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function resetGame(msg, id) {
  const command = msg.text.split(' ')[0];
  if (games[id]) {
    if (command == 'all') {
      reply(msg, 'Resetting ALL Hungry Games data for this server!');
      delete games[id];
    } else if (command == 'events') {
      reply(msg, 'Resetting ALL Hungry Games events for this server!');
      games[id].customEvents = {bloodbath: [], player: [], arena: []};
    } else if (command == 'current') {
      reply(msg, 'Resetting ALL data for current game!');
      delete games[id].currentGame;
    } else if (command == 'options') {
      reply(msg, 'Resetting ALL options!');
      games[id].options = defaultOptions;
    } else if (command == 'teams') {
      reply(msg, 'Resetting ALL teams!');
      games[id].currentGame.teams = [];
      formTeams(id);
    } else {
      reply(msg, 'Please specify what data to reset.\nall {deletes all data for this server},\nevents {deletes all custom events},\ncurrent {deletes all data about the current game},\noptions {resets all options to default values},\nteams {delete all teams and creates new ones}.');
    }
  } else {
    reply(
        msg, 'There is no data to reset. Start a new game with "hgcreate".');
  }
}
/**
 * Send all of the game data about the current server to the chat.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function showGameInfo(msg, id) {
  if (games[id]) {
    let message = JSON.stringify(games[id], null, 2);
    let messages = [];
    while (message.length > 0) {
      let newChunk =
          message.substring(0, message.length >= 1950 ? 1950 : message.length);
      messages.push(newChunk);
      message = message.replace(newChunk, '');
    }
    for (let i in messages) {
      reply(msg, messages[i]).catch((err) => {
        console.log(err);
      });
    }
  } else {
    reply(msg, 'No game created');
  }
}
/**
 * Send all event data about the default events to the chat.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function showGameEvents(msg, id) {
  let events = defaultBloodbathEvents;
  if (games[id] && games[id].customEvents.bloodbath) {
    events = events.concat(games[id].customEvents.bloodbath);
  }
  let file = new Discord.MessageAttachment();
  file.setFile(Buffer.from(JSON.stringify(events, null, 2)));
  file.setName('BloodbathEvents.json');
  fetchStats(events);
  msg.channel.send(
      'Bloodbath Events (' + events.length + ') ' +
          Math.round(events.numKill / events.length * 1000) / 10 + '% kill, ' +
          Math.round(events.numWound / events.length * 1000) / 10 +
          '% wound, ' +
          Math.round(events.numThrive / events.length * 1000) / 10 + '% heal.',
      file);

  events = defaultPlayerEvents;
  if (games[id] && games[id].customEvents.player) {
    events = events.concat(games[id].customEvents.player);
  }
  file = new Discord.MessageAttachment();
  file.setFile(Buffer.from(JSON.stringify(events, null, 2)));
  file.setName('PlayerEvents.json');
  fetchStats(events);
  msg.channel.send(
      'Player Events (' + events.length + ') ' +
          Math.round(events.numKill / events.length * 1000) / 10 + '% kill, ' +
          Math.round(events.numWound / events.length * 1000) / 10 +
          '% wound, ' +
          Math.round(events.numThrive / events.length * 1000) / 10 + '% heal.',
      file);

  events = defaultArenaEvents;
  if (games[id] && games[id].customEvents.arena) {
    events = events.concat(games[id].customEvents.arena);
  }
  file = new Discord.MessageAttachment();
  file.setFile(Buffer.from(JSON.stringify(events, null, 2)));
  file.setName('ArenaEvents.json');
  msg.channel.send('Arena Events (' + events.length + ')', file);
}

// Time Control //
/**
 * Start the games in the channel this was called from.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function startGame(msg, id) {
  if (games[id] && games[id].currentGame && games[id].currentGame.inProgress) {
    reply(
        msg, 'A game is already in progress! ("' + myPrefix +
            'next" for next day, or "' + myPrefix + 'end" to abort)');
  } else {
    createGame(msg, id, true);
    let teamList = '';
    let numUsers = games[id].currentGame.includedUsers.length;
    if (games[id].options.teamSize > 0) {
      teamList =
          games[id]
              .currentGame.teams
              .map(function(team, index) {
                return '__' + team.name + '__: ' +
                    team.players
                        .map(function(player) {
                          try {
                            return '`' +
                                games[id]
                                    .currentGame.includedUsers
                                    .find(function(obj) {
                                      return obj.id == player;
                                    })
                                    .name +
                                '`';
                          } catch (err) {
                            common.error(
                                'Failed to find player' + player +
                                ' in included users.');
                            console.log(games[id].currentGame.teams);
                            throw err;
                          }
                        })
                        .join(', ');
              })
              .join('\n');
    } else {
      teamList = games[id].currentGame.includedUsers.map(function(obj) {
        return obj.name;
      }).join(', ');
    }

    let included = `**Included** (${numUsers}):\n${teamList}\n`;
    let excluded = '';
    if (games[id].excludedUsers.length > 0) {
      excluded = '**Excluded** (' + games[id].excludedUsers.length + '):\n' +
          games[id].excludedUsers.map(function(obj) {
            return getName(msg, obj);
          }).join(', ');
    }

    reply(
        msg,
        getMessage('gameStart') + (games[id].autoPlay ? '' : '\n("' + myPrefix +
                                           'next" for next day.)'),
        (games[id].options.mentionEveryoneAtStart ? '@everyone\n' : '') +
            included + excluded);
    games[id].currentGame.inProgress = true;
    if (games[id].autoPlay) {
      nextDay(msg, id);
    }
  }
}
/**
 * Stop autoplaying.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function pauseAutoplay(msg, id) {
  if (!games[id]) {
    reply(
        msg, 'You must create a game first before using autoplay. Use "' +
            myPrefix + 'create" to do this.');
  } else if (games[id].autoPlay) {
    msg.channel.send(
        '<@' + msg.author.id +
        '> `Autoplay will stop at the end of the current day.`');
    games[id].autoPlay = false;
  } else {
    reply(
        msg, 'Not autoplaying. If you wish to autoplay, type "' + myPrefix +
            'autoplay".');
  }
}
/**
 * Start autoplaying.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function startAutoplay(msg, id) {
  if (!games[id]) {
    createGame(msg, id);
  }
  if (games[id].autoPlay && games[id].inProgress) {
    reply(
        msg, 'Already autoplaying. If you wish to stop autoplaying, type "' +
            myPrefix + 'pause".');
  } else {
    games[id].autoPlay = true;
    if (games[id].currentGame.inProgress &&
        games[id].currentGame.day.state === 0) {
      msg.channel.send(
          '<@' + msg.author.id +
          '> `Enabling Autoplay! Starting the next day!`');
      nextDay(msg, id);
    } else if (!games[id].currentGame.inProgress) {
      /* msg.channel.send(
          "<@" + msg.author.id + "> `Autoplay is enabled, type \"" + myPrefix +
          "start\" to begin!`"); */
      msg.channel.send(
          '<@' + msg.author.id +
          '> `Autoplay is enabled. Starting the games!`');
      startGame(msg, id);
    } else {
      msg.channel.send('<@' + msg.author.id + '> `Enabling autoplay!`');
    }
  }
}
/**
 * Simulate a single day then show events to users.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function nextDay(msg, id) {
  if (!games[id] || !games[id].currentGame ||
      !games[id].currentGame.inProgress) {
    reply(
        msg, 'You must start a game first! Use "' + myPrefix +
            'start" to start a game!');
    return;
  }
  if (games[id].currentGame.day.state !== 0) {
    if (intervals[id]) {
      reply(msg, 'Already simulating day.');
    } else if (games[id].currentGame.day.state == 1) {
      reply(
          msg,
          'I think I\'m already simulating... if this isn\'t true this game has crashed and you must end the game.');
    } else {
      intervals[id] = client.setInterval(function() {
        printEvent(msg, id);
      }, games[id].options.delayEvents);
    }
    return;
  }
  games[id].currentGame.day.state = 1;
  games[id].currentGame.day.num++;
  games[id].currentGame.day.events = [];

  let deadPool = games[id].currentGame.includedUsers.filter(function(obj) {
    return !obj.living;
  });
  while (games[id].options.resurrection &&
         Math.random() < games[id].options.probabilityOfResurrect &&
         deadPool.length > 0) {
    let resurrected =
        deadPool.splice(Math.floor(Math.random() * deadPool.length), 1)[0];
    resurrected.living = true;
    resurrected.state = 'zombie';
    games[id].currentGame.includedUsers.forEach(function(obj) {
      if (!obj.living && obj.rank < resurrected.rank) obj.rank++;
    });
    resurrected.rank = 1;
    games[id].currentGame.numAlive++;
    games[id].currentGame.day.events.push(
        makeSingleEvent(
            getMessage('resurrected'), [resurrected], 1, 0,
            games[id].options.mentionAll, id, 'thrives', 'nothing'));
    if (games[id].options.teamSize > 0) {
      let team = games[id].currentGame.teams.find(function(obj) {
        return obj.players.findIndex(function(obj) {
          return resurrected.id == obj;
        }) > -1;
      });
      team.numAlive++;
      games[id].currentGame.teams.forEach(function(obj) {
        if (obj.numAlive === 0 && obj.rank < team.rank) obj.rank++;
      });
      team.rank = 1;
      }
  }


  let userPool = games[id].currentGame.includedUsers.filter(function(obj) {
    return obj.living;
  });
  let startingAlive = userPool.length;
  let userEventPool;
  let doArenaEvent = false;
  if (games[id].currentGame.day.num === 0) {
    userEventPool =
        defaultBloodbathEvents.concat(games[id].customEvents.bloodbath);
  } else {
    doArenaEvent = games[id].options.arenaEvents &&
        Math.random() < games[id].options.probabilityOfArenaEvent;
    if (doArenaEvent) {
      let arenaEventPool = defaultArenaEvents.concat(games[id].customEvents.arena);
      let index = Math.floor(Math.random() * arenaEventPool.length);
      let arenaEvent = arenaEventPool[index];
      games[id].currentGame.day.events.push(
          makeMessageEvent(getMessage('eventStart'), id));
      games[id].currentGame.day.events.push(
          makeMessageEvent('**___' + arenaEvent.message + '___**', id));
      userEventPool = arenaEvent.outcomes;
    } else {
      userEventPool = defaultPlayerEvents.concat(games[id].customEvents.player);
    }
  }

  const deathRate = games[id].currentGame.day.num === 0 ?
      games[id].options.bloodbathDeathRate :
      games[id].options.playerDeathRate;

  let loop = 0;
  while (userPool.length > 0) {
    let eventTry;
    let affectedUsers;
    let numAttacker, numVictim;
    let doBattle = !doArenaEvent && userPool.length > 1 &&
        (Math.random() < games[id].options.probabilityOfBattle ||
         games[id].currentGame.numAlive == 2) &&
        validateEventRequirements(
            1, 1, userPool, games[id].currentGame.numAlive,
            games[id].currentGame.teams, games[id].options, true, false);
    if (doBattle) {
      do {
        numAttacker = weightedUserRand();
        numVictim = weightedUserRand();
      } while (!validateEventRequirements(
          numVictim, numAttacker, userPool, games[id].currentGame.numAlive,
          games[id].currentGame.teams, games[id].options, true, false));
      affectedUsers = pickAffectedPlayers(
          numVictim, numAttacker, games[id].options, userPool,
          games[id].currentGame.teams);
      eventTry = makeBattleEvent(
          affectedUsers, numVictim, numAttacker, games[id].options.mentionAll,
          id);
    } else {
      eventTry = pickEvent(
          userPool, userEventPool, games[id].options,
          games[id].currentGame.numAlive, games[id].currentGame.teams,
          deathRate);
      if (!eventTry) {
        reply(msg, 'A stupid error happened :(');
        games[id].currentGame.day.state = 0;
        return;
      }

      numAttacker = eventTry.attacker.count;
      numVictim = eventTry.victim.count;
      affectedUsers = pickAffectedPlayers(
          numVictim, numAttacker, games[id].options, userPool,
          games[id].currentGame.teams);
    }

    effectUser = function(i, kills) {
      if (!affectedUsers[i]) {
        common.error(
            'Affected users invalid index:' + i + '/' + affectedUsers.length,
            'HG');
        console.log(affectedUsers);
      }
      let index = games[id].currentGame.includedUsers.findIndex(function(obj) {
        return obj.id == affectedUsers[i].id;
      });
      if (games[id].currentGame.includedUsers[index].state == 'wounded') {
        games[id].currentGame.includedUsers[index].bleeding++;
      } else {
        games[id].currentGame.includedUsers[index].bleeding = 0;
      }
      games[id].currentGame.includedUsers[index].kills += kills;
      return index;
    };

    let numKilled = 0;
    killUser = function(i, k) {
      numKilled++;
      let index = effectUser(i, k);
      games[id].currentGame.includedUsers[index].living = false;
      games[id].currentGame.includedUsers[index].bleeding = 0;
      games[id].currentGame.includedUsers[index].state = 'dead';
      games[id].currentGame.includedUsers[index].rank =
          games[id].currentGame.numAlive--;
      if (games[id].options.teamSize > 0) {
        let team = games[id].currentGame.teams.find(function(team) {
          return team.players.findIndex(function(obj) {
            return games[id].currentGame.includedUsers[index].id == obj;
          }) > -1;
        });
        if (!team) {
          console.log(
              'FAILED TO FIND ADEQUATE TEAM FOR USER',
              games[id].currentGame.includedUsers[index]);
        } else {
          team.numAlive--;
          if (team.numAlive === 0) {
            let teamsLeft = 0;
            games[id].currentGame.teams.forEach(function(obj) {
              if (obj.numAlive > 0) teamsLeft++;
            });
            team.rank = teamsLeft + 1;
          }
        }
      }
    };

    woundUser = function(i, k) {
      let index = effectUser(i, k);
      games[id].currentGame.includedUsers[index].state = 'wounded';
    };
    restoreUser = function(i, k) {
      let index = effectUser(i, k);
      games[id].currentGame.includedUsers[index].state = 'normal';
    };

    for (let i = 0; i < numVictim; i++) {
      let numKills = 0;
      if (eventTry.victim.killer) numKills = numAttacker;
      switch (eventTry.victim.outcome) {
        case 'dies':
          killUser(i, numKills);
          break;
        case 'wounded':
          woundUser(i, numKills);
          break;
        case 'thrives':
          restoreUser(i, numKills);
          break;
        default:
          effectUser(i, numKills);
          break;
      }
    }
    for (let i = numVictim; i < numVictim + numAttacker; i++) {
      let numKills = 0;
      if (eventTry.attacker.killer) numKills = numVictim;
      switch (eventTry.attacker.outcome) {
        case 'dies':
          killUser(i, numKills);
          break;
        case 'wounded':
          woundUser(i, numKills);
          break;
        case 'thrives':
          restoreUser(i, numKills);
          break;
        default:
          effectUser(i, numKills);
          break;
      }
    }

    let finalEvent = eventTry;
    if (doBattle) {
      affectedUsers = [];
    } else {
      finalEvent = makeSingleEvent(
          eventTry.message, affectedUsers, numVictim, numAttacker,
          games[id].options.mentionAll, id, eventTry.victim.outcome,
          eventTry.attacker.outcome);
    }
    /* if (eventTry.attacker.killer && eventTry.victim.killer) {
      finalEvent.icons.splice(numVictim, 0, {url: fistBoth});
    } else if (eventTry.attacker.killer) {
      finalEvent.icons.splice(numVictim, 0, {url: fistRight});
    } else if (eventTry.victim.killer) {
      finalEvent.icons.splice(numVictim, 0, {url: fistLeft});
    } */
    games[id].currentGame.day.events.push(finalEvent);

    if (affectedUsers.length !== 0) {
      console.log('Affected users remain! ' + affectedUsers.length);
    }

    if (numKilled > 5) {
      games[id].currentGame.day.events.push(
          makeMessageEvent(getMessage('slaughter'), id));
    }
  }

  if (doArenaEvent) {
    games[id].currentGame.day.events.push(
        makeMessageEvent(getMessage('eventEnd'), id));
  }
  let usersBleeding = [];
  let usersRecovered = [];
  games[id].currentGame.includedUsers.forEach(function(obj) {
    if (obj.bleeding > 0 && obj.bleeding >= games[id].options.bleedDays &&
        obj.living) {
      if (Math.random() < games[id].options.probabilityOfBleedToDeath &&
          (games[id].options.allowNoVictors ||
           games[id].currentGame.numAlive > 1)) {
        usersBleeding.push(obj);
        obj.living = false;
        obj.bleeding = 0;
        obj.state = 'dead';
        obj.rank = games[id].currentGame.numAlive--;
        if (games[id].options.teamSize > 0) {
          let team = games[id].currentGame.teams.find(function(team) {
            return team.players.findIndex(function(player) {
              return obj.id == player;
            }) > -1;
          });
          team.numAlive--;
          if (team.numAlive === 0) {
            let teamsLeft = 0;
            games[id].currentGame.teams.forEach(function(obj) {
              if (obj.numAlive > 0) teamsLeft++;
            });
            team.rank = teamsLeft + 1;
          }
        }
      } else {
        usersRecovered.push(obj);
        obj.bleeding = 0;
        obj.state = 'normal';
      }
    }
  });
  if (usersRecovered.length > 0) {
    games[id].currentGame.day.events.push(
        makeSingleEvent(
            getMessage('patchWounds'), usersRecovered, usersRecovered.length, 0,
            games[id].options.mentionAll, id, 'thrives', 'nothing'));
  }
  if (usersBleeding.length > 0) {
    games[id].currentGame.day.events.push(
        makeSingleEvent(
            getMessage('bleedOut'), usersBleeding, usersBleeding.length, 0,
            games[id].options.mentionAll, id, 'dies', 'nothing'));
  }

  let deathPercentage = 1 - (games[id].currentGame.numAlive / startingAlive);
  if (deathPercentage > lotsOfDeathRate) {
    games[id].currentGame.day.events.splice(
        0, 0, makeMessageEvent(getMessage('lotsOfDeath'), id));
  } else if (deathPercentage === 0) {
    games[id].currentGame.day.events.splice(
        0, 0, makeMessageEvent(getMessage('noDeath'), id));
  } else if (deathPercentage < littleDeathRate) {
    games[id].currentGame.day.events.splice(
        0, 0, makeMessageEvent(getMessage('littleDeath'), id));
  }

  // Signal ready to display events.
  games[id].currentGame.day.state = 2;

  let embed = new Discord.MessageEmbed();
  if (games[id].currentGame.day.num === 0) {
    embed.setTitle(getMessage('bloodbathStart'));
  } else {
    embed.setTitle(
        getMessage('dayStart').replaceAll('{}', games[id].currentGame.day.num));
  }
  embed.setColor(defaultColor);
  msg.channel.send(embed);
  command.disable('say', msg.channel.id);
  games[id].outputChannel = msg.channel.id;
  intervals[id] = client.setInterval(function() {
    printEvent(msg, id);
  }, games[id].options.delayEvents);
}
/**
 * Pick event that satisfies all requirements and settings.
 *
 * @param {Player[]} userPool Pool of players left to chose from in this day.
 * @param {Event[]} eventPool Pool of all events available to choose at this
 * time.
 * @param {Object} options The options set in the current game.
 * @param {number} numAlive Number of players in the game still alive.
 * @param {Team[]} teams Array of teams in this game.
 * @param {{kill: number, nothing: number}} deathRate Death rate weights.
 * @return {?Event} The chosen event that satisfies all requirements, or null if
 * something went wrong.
 */
function pickEvent(userPool, eventPool, options, numAlive, teams, deathRate) {
  let loop = 0;
  while (loop < 100) {
    loop++;
    let eventIndex = weightedEvent(eventPool, deathRate);
    let eventTry = eventPool[eventIndex];
    if (!eventTry) {
      common.error('Event at index ' + eventIndex + ' is invalid!', 'HG');
      continue;
    }

    let numAttacker = eventTry.attacker.count * 1;
    let numVictim = eventTry.victim.count * 1;

    let eventEffectsNumMin = 0;
    if (numVictim < 0) eventEffectsNumMin -= numVictim;
    else eventEffectsNumMin += numVictim;
    if (numAttacker < 0) eventEffectsNumMin -= numAttacker;
    else eventEffectsNumMin += numAttacker;

    // If the chosen event requires more players than there are remaining, pick
    // a new event.
    if (eventEffectsNumMin > userPool.length) continue;

    let multiAttacker = numAttacker < 0;
    let multiVictim = numVictim < 0;
    let attackerMin = -numAttacker;
    let victimMin = -numVictim;
    if (multiAttacker || multiVictim) {
      do {
        if (multiAttacker) numAttacker = weightedUserRand() + (attackerMin - 1);
        if (multiVictim) numVictim = weightedUserRand() + (victimMin - 1);
      } while (numAttacker + numVictim > userPool.length);
    }

    if (!validateEventRequirements(
            numVictim, numAttacker, userPool, numAlive, teams, options,
            eventTry.victim.outcome == 'dies',
            eventTry.attacker.outcome == 'dies')) {
      continue;
    }

    eventTry = eventPool.slice(eventIndex, eventIndex + 1)[0];

    eventTry.attacker.count = numAttacker;
    eventTry.victim.count = numVictim;

    return eventTry;
  }
  common.error(
      'Failed to find suitable event for ' + userPool.length + ' of ' +
          eventPool.length + ' events.',
      'HG');
  return null;
}
/**
 * Ensure teammates don't attack eachother.
 *
 * @param {number} numVictim The number of victims in the event.
 * @param {number} numAttacker The number of attackers in the event.
 * @param {Player[]} userPool Pool of all remaining players to put into an
 * event.
 * @param {Team[]} teams All teams in this game.
 * @param {Object} options Options for this game.
 * @param {boolean} victimsDie Do the victims die in this event?
 * @param {boolean} attackersDie Do the attackers die in this event?
 * @return {boolean} Is is possible to use this event with current settings
 * about teammates.
 */
function validateEventTeamConstraint(
    numVictim, numAttacker, userPool, teams, options, victimsDie,
    attackersDie) {
  if (options.teammatesCollaborate && options.teamSize > 0) {
    let largestTeam = {index: 0, size: 0};
    let numTeams = 0;
    for (let i = 0; i < teams.length; i++) {
      let team = teams[i];
      let numPool = 0;

      team.players.forEach(function(player) {
        if (userPool.findIndex(function(pool) {
              return pool.id == player && pool.living;
            }) > -1) {
          numPool++;
        }
      });

      team.numPool = numPool;
      if (numPool > largestTeam.size) {
        largestTeam = {index: i, size: numPool};
      }
      if (numPool > 0) numTeams++;
    }
    if (numTeams < 2) {
      if (attackersDie || victimsDie) {
        return false;
      }
    }
    return (numAttacker <= largestTeam.size &&
            numVictim <= userPool.length - largestTeam.size) ||
        (numVictim <= largestTeam.size &&
         numAttacker <= userPool.length - largestTeam.size);
  }
  return true;
}
/**
 * Ensure the event we choose will not force all players to be dead.
 *
 * @param {number} numVictim Number of victims in this event.
 * @param {number} numAttacker Number of attackers in this event.
 * @param {number} numAlive Total number of living players left in the game.
 * @param {Object} options The options set for this game.
 * @param {boolean} victimsDie Do the victims die in this event?
 * @param {boolean} attackersDie Do the attackers die in this event?
 * @return {boolean} Will this event follow current options set about number of
 * victors required.
 */
function validateEventVictorConstraint(
    numVictim, numAttacker, numAlive, options, victimsDie, attackersDie) {
  if (!options.allowNoVictors) {
    let numRemaining = numAlive;
    if (victimsDie) numRemaining -= numVictim;
    if (attackersDie) numRemaining -= numAttacker;
    return numRemaining >= 1;
  }
  return true;
}
/**
 * Ensure the number of users in an event is mathematically possible.
 *
 * @param {number} numVictim Number of victims in this event.
 * @param {number} numAttacker Number of attackers in this event.
 * @param {Player[]} userPool Pool of all remaining players to put into an
 * event.
 * @param {number} numAlive Total number of living players left in the game.
 * @return {boolean} If the event requires a number of players that is valid
 * from the number of plaers left to choose from.
 */
function validateEventNumConstraint(
    numVictim, numAttacker, userPool, numAlive) {
  return numVictim + numAttacker <= userPool.length &&
      numVictim + numAttacker <= numAlive;
}
/**
 * Ensure the event chosen meets all requirements for actually being used in the
 * current game.
 *
 * @param {number} numVictim Number of victims in this event.
 * @param {number} numAttacker Number of attackers in this event.
 * @param {Player[]} userPool Pool of all remaining players to put into an
 * event.
 * @param {number} numAlive Total number of living players left in the game.
 * @param {Team[]} teams All teams in this game.
 * @param {Object} options The options set for this game.
 * @param {boolean} victimsDie Do the victims die in this event?
 * @param {boolean} attackersDie Do the attackers die in this event?
 * @return {boolean} If all constraints are met with the given event.
 */
function validateEventRequirements(
    numVictim, numAttacker, userPool, numAlive, teams, options, victimsDie,
    attackersDie) {
  return validateEventNumConstraint(
             numVictim, numAttacker, userPool, numAlive) &&
      validateEventTeamConstraint(
             numVictim, numAttacker, userPool, teams, options, victimsDie,
             attackersDie) &&
      validateEventVictorConstraint(
             numVictim, numAttacker, numAlive, options, victimsDie,
             attackersDie);
}
/**
 * Pick the players to put into an event.
 *
 * @param {number} numVictim Number of victims in this event.
 * @param {number} numAttacker Number of attackers in this event.
 * @param {Object} options Options for this game.
 * @param {Player[]} userPool Pool of all remaining players to put into an
 * event.
 * @param {Team[]} teams All teams in this game.
 * @return {Player[]} Array of all players that will be affected by this event.
 */
function pickAffectedPlayers(
    numVictim, numAttacker, options, userPool, teams) {
  let affectedUsers = [];
  if (options.teammatesCollaborate && options.teamSize > 0) {
    let isAttacker = false;
    let validTeam = teams.findIndex(function(team) {
      let canBeVictim = false;
      if (numAttacker <= team.numPool &&
          numVictim <= userPool.length - team.numPool) {
        isAttacker = true;
      }
      if (numVictim <= team.numPool &&
          numAttacker <= userPool.length - team.numPool) {
        canBeVictim = true;
      }
      if (!isAttacker && !canBeVictim) {
        return false;
      }
      if (isAttacker && canBeVictim) {
        isAttacker = Math.random() > 0.5;
      }
      return true;
    });
    findMatching = function(match) {
      return userPool.findIndex(function(pool) {
        let teamId = teams.findIndex(function(team) {
          return team.players.findIndex(function(player) {
            return player == pool.id;
          }) > -1;
        });
        return match ? (teamId == validTeam) : (teamId != validTeam);
      });
    };
    for (let i = 0; i < numAttacker + numVictim; i++) {
      let userIndex = findMatching(
          (i < numVictim && !isAttacker) || (i >= numVictim && isAttacker));
      affectedUsers.push(userPool.splice(userIndex, 1)[0]);
    }
  } else {
    for (let i = 0; i < numAttacker + numVictim; i++) {
      let userIndex = Math.floor(Math.random() * userPool.length);
      affectedUsers.push(userPool.splice(userIndex, 1)[0]);
    }
  }
  return affectedUsers;
}
/**
 * Make an event that contains a battle between players before the main event
 * message.
 *
 * @param {Player[]} affectedUsers All of the players involved in the event.
 * @param {number} numVictim The number of victims in this event.
 * @param {number} numAttacker The number of attackers in this event.
 * @param {boolean} mention Should every player be mentioned when their name
 * comes up?
 * @param {string} id The id of the guild that triggered this initially.
 * @return {Event} The event that was created.
 */
function makeBattleEvent(affectedUsers, numVictim, numAttacker, mention, id) {
  const outcomeMessage =
      battles.outcomes[Math.floor(Math.random() * battles.outcomes.length)];
  let finalEvent = makeSingleEvent(
      outcomeMessage, affectedUsers.slice(0), numVictim, numAttacker, mention,
      id, 'dies', 'nothing');
  finalEvent.attacker.killer = true;
  finalEvent.battle = true;
  finalEvent.state = 0;
  finalEvent.attacks = [];

  let userHealth = new Array(affectedUsers.length).fill(0);
  const maxHealth = games[id].options.battleHealth * 1;
  let numAlive = numVictim;
  let duplicateCount = 0;
  let lastAttack = {index: 0, attacker: 0, victim: 0, flipRoles: false};

  const startMessage =
      battles.starts[Math.floor(Math.random() * battles.starts.length)];
  const battleString = '**A battle has broken out!**';
  let healthText = affectedUsers
                       .map(function(obj, index) {
                         return '`' + obj.name + '`: ' +
                             Math.max((maxHealth - userHealth[index]), 0) +
                             'HP';
                       })
                       .sort(function(a, b) {
                          return a.id - b.id;
                        })
                       .join(', ');
  finalEvent.attacks.push(
      makeSingleEvent(
          battleString + '\n' + startMessage + '\n' + healthText,
          affectedUsers.slice(0), numVictim, numAttacker, false, id, 'nothing',
          'nothing'));

  let loop = 0;
  do {
    loop++;
    if (loop > 1000) {
      throw ('INFINITE LOOP');
    }
    let eventIndex = Math.floor(Math.random() * battles.attacks.length);
    let eventTry = battles.attacks[eventIndex];
    eventTry.attacker.damage *= 1;
    eventTry.victim.damage *= 1;

    const flipRoles = Math.random() > 0.5;
    const attackerIndex = Math.floor(Math.random() * numAttacker) + numVictim;

    if (loop == 999) {
      console.log(
          'Failed to find valid event for battle!\n', eventTry, flipRoles,
          userHealth, '\nAttacker:', attackerIndex, '\nUsers:',
          affectedUsers.length, '\nAlive:', numAlive, '\nFINAL:', finalEvent);
    }

    if ((!flipRoles &&
         userHealth[attackerIndex] + eventTry.attacker.damage >= maxHealth) ||
        (flipRoles &&
         userHealth[attackerIndex] + eventTry.victim.damage >= maxHealth)) {
      continue;
    }

    let victimIndex = Math.floor(Math.random() * numAlive);

    let count = 0;
    for (let i = 0; i < numVictim; i++) {
      if (userHealth[i] < maxHealth) count++;
      if (count == victimIndex + 1) {
        victimIndex = i;
        break;
      }
    }

    const victimDamage =
        (flipRoles ? eventTry.attacker.damage : eventTry.victim.damage);
    const attackerDamage =
        (!flipRoles ? eventTry.attacker.damage : eventTry.victim.damage);

    userHealth[victimIndex] += victimDamage;
    userHealth[attackerIndex] += attackerDamage;

    if (userHealth[victimIndex] >= maxHealth) {
      numAlive--;
    }

    if (lastAttack.index == eventIndex &&
        lastAttack.attacker == attackerIndex &&
        lastAttack.victim == victimIndex && lastAttack.flipRoles == flipRoles) {
      duplicateCount++;
    } else {
      duplicateCount = 0;
    }
    lastAttack = {
      index: eventIndex,
      attacker: attackerIndex,
      victim: victimIndex,
      flipRoles: flipRoles,
    };

    healthText =
        affectedUsers
            .map(function(obj, index) {
              const health = Math.max((maxHealth - userHealth[index]), 0);
              const prePost = health === 0 ? '~~' : '';
              return prePost + '`' + obj.name + '`: ' + health + 'HP' + prePost;
            })
            .sort(function(a, b) {
              return a.id - b.id;
            })
            .join(', ');
    let messageText = eventTry.message;
    if (duplicateCount > 0) {
      messageText += ' x' + (duplicateCount + 1);
    }

    let newEvent = makeSingleEvent(
        battleString + '\n' + messageText + '\n' + healthText,
        [
          affectedUsers[flipRoles ? attackerIndex : victimIndex],
          affectedUsers[flipRoles ? victimIndex : attackerIndex],
        ],
        1, 1, false, id,
        !flipRoles && userHealth[victimIndex] >= maxHealth ? 'dies' : 'nothing',
        flipRoles && userHealth[victimIndex] >= maxHealth ? 'dies' : 'nothing');

    if (victimDamage && attackerDamage) {
      newEvent.icons.splice(1, 0, {url: fistBoth});
    } else if (attackerDamage) {
      newEvent.icons.splice(1, 0, {url: flipRoles ? fistLeft : fistRight});
    } else if (victimDamage) {
      newEvent.icons.splice(1, 0, {url: flipRoles ? fistRight : fistLeft});
    }

    finalEvent.attacks.push(newEvent);
  } while (numAlive > 0);
  return finalEvent;
}
/**
 * Produce a random number that is weighted by multiEventUserDistribution.
 *
 * @return {number} The weighted number outcome.
 */
function weightedUserRand() {
  let i, sum = 0, r = Math.random();
  for (i in multiEventUserDistribution) {
    sum += multiEventUserDistribution[i];
    if (r <= sum) return i * 1;
  }
}
/**
 * Produce a random event that using weighted probabilities.
 *
 * @param {Event[]} eventPool The pool of all events to consider.
 * @param {{kill: number, nothing: number}} weightOpt The weighting options.
 * @return {number} The index of the event that was chosen.
 */
function weightedEvent(eventPool, weightOpt) {
  const rates = deathRateWeights[weightOpt];
  let sum = 0;
  for (let i in eventPool) {
    if (!eventPool[i]) continue;
    if (isEventDeadly(eventPool[i])) {
      sum += rates.kill;
    } else {
      sum += rates.nothing;
    }
  }
  const rand = Math.random() * sum;
  sum = 0;
  for (let i in eventPool) {
    if (!eventPool[i]) continue;
    if (isEventDeadly(eventPool[i])) {
      sum += rates.kill;
    } else {
      sum += rates.nothing;
    }
    if (rand <= sum) return i;
  }
  throw ('BROKEN WEIGHTED EVENT GENERATOR.');
}
/**
 * Decide if the given event should be considered deadly.
 *
 * @param {Event} eventTry The event to check.
 * @return {boolean} If the event is considered deadly.
 */
function isEventDeadly(eventTry) {
  return eventTry.attacker.outcome == 'dies' ||
      eventTry.victim.outcome == 'dies' ||
      eventTry.attacker.outcome == 'wounded' ||
      eventTry.victim.outcome == 'wounded';
}
/**
 * Format an array of users into names based on options and grammar rules.
 *
 * @param {Player[]} names An array of players to format the names of.
 * @param {boolean} mention Should the players be mentioned or just show their
 * name normally.
 * @return {string} The formatted string of names.
 */
function formatMultiNames(names, mention) {
  let output = '';
  for (let i = 0; i < names.length; i++) {
    if (mention) {
      output += '<@' + names[i].id + '>';
    } else {
      output += '`' + names[i].name + '`';
    }

    if (i == names.length - 2) output += ', and ';
    else if (i != names.length - 1) output += ', ';
  }
  return output;
}
/**
 * Make an event that doesn't affect any players and is just a plain message.
 *
 * @param {string} message The message to show.
 * @param {string} id The id of the guild that initially triggered this.
 * @return {Event} The event that was created.
 */
function makeMessageEvent(message, id) {
  return makeSingleEvent(message, [], 0, 0, false, id, 'nothing', 'nothing');
}
/**
 * Format an event string based on specified users.
 *
 * @param {string} message The message to show.
 * @param {Player[]} affectedUsers An array of all users affected by this event.
 * @param {number} numVictim Number of victims in this event.
 * @param {number} numAttacker Number of attackers in this event.
 * @param {boolean} mention Should all users be mentioned when their name
 * appears?
 * @param {string} id The id of the guild this was initially triggered from.
 * @param {string} victimOutcome The outcome of the victims from this event.
 * @param {string} attackerOutcome The outcome of the attackers from this event.
 * @return {FinalEvent} The final event that was created and formatted ready for
 * display.
 */
function makeSingleEvent(
    message, affectedUsers, numVictim, numAttacker, mention, id, victimOutcome,
    attackerOutcome) {
  let affectedVictims = affectedUsers.splice(0, numVictim);
  let affectedAttackers = affectedUsers.splice(0, numAttacker);
  let finalMessage = message;
  finalMessage = finalMessage.replace(
      /\[V([^\|]*)\|([^\]]*)\]/g,
      '$' + (affectedVictims.length > 1 ? '2' : '1'));
  finalMessage = finalMessage.replace(
      /\[A([^\|]*)\|([^\]]*)\]/g,
      '$' + (affectedAttackers.length > 1 ? '2' : '1'));
  finalMessage =
      finalMessage
          .replaceAll('{victim}', formatMultiNames(affectedVictims, mention))
          .replaceAll(
              '{attacker}', formatMultiNames(affectedAttackers, mention));
  if (finalMessage.indexOf('{dead}') > -1) {
    let deadUsers = games[id]
                        .currentGame.includedUsers
                        .filter(function(obj) {
                          return !obj.living;
                        })
                        .slice(0, weightedUserRand());
    if (deadUsers.length === 0) {
      finalMessage = finalMessage.replaceAll('{dead}', 'an animal');
    } else {
      finalMessage =
          finalMessage.replaceAll('{dead}', formatMultiNames(deadUsers, false));
    }
  }
  let finalIcons = getMiniIcons(affectedVictims.concat(affectedAttackers));
  return {
    message: finalMessage,
    icons: finalIcons,
    numVictim: numVictim,
    victim: {outcome: victimOutcome},
    attacker: {outcome: attackerOutcome},
  };
}
/**
 * Get an array of icons urls from an array of users.
 *
 * @param {Player[]} users Array of users to process.
 * @return {{url: string, id: string}[]} The user ids and urls for all users
 * avatars.
 */
function getMiniIcons(users) {
  return users.map(function(obj) {
    return {
      url: obj.avatarURL.replace(/\?size=[0-9]*/, '') + '?size=' + fetchSize,
      id: obj.id,
    };
  });
}
/**
 * Print an event string to the channel and add images, or if no events remain,
 * trigger end of day.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function printEvent(msg, id) {
  let index = games[id].currentGame.day.state - 2;
  let events = games[id].currentGame.day.events;
  if (index == events.length) {
    client.clearInterval(intervals[id]);
    delete intervals[id];
    printDay(msg, id);
  } else if (
      events[index].battle &&
      events[index].state < events[index].attacks.length) {
    const battleState = events[index].state;
    let embed = new Discord.MessageEmbed();
    const message = events[index].attacks[battleState].message.split('\n');
    embed.addField(message[1], message[2]);
    embed.setColor([50, 0, 0]);

    if (events[index].attacks[battleState].icons.length === 0) {
      // Send without image.
      if (!battleMessage[id]) {
        msg.channel.send(message[0], embed).then((msg_) => {
          battleMessage[id] = msg_;
        });
      } else {
        battleMessage[id].edit(message[0], embed);
      }
    } else {
      // Create image, then send.
      let finalImage = new jimp(
          events[index].attacks[battleState].icons.length *
                  (battleIconSize + iconGap) -
              iconGap,
          battleIconSize + iconGap);
      let responses = 0;
      newImage = function(image, outcome, placement) {
        image.resize(battleIconSize, battleIconSize);
        if (outcome == 'dies') {
          finalImage.blit(
              new jimp(battleIconSize, iconGap, 0xFF0000FF),
              placement * (battleIconSize + iconGap), battleIconSize);
        } else if (outcome == 'wounded') {
          finalImage.blit(
              new jimp(battleIconSize, iconGap, 0xFFFF00FF),
              placement * (battleIconSize + iconGap), battleIconSize);
        }
        finalImage.blit(image, placement * (battleIconSize + iconGap), 0);
        responses++;
        if (responses == events[index].attacks[battleState].icons.length) {
          finalImage.getBuffer(jimp.MIME_PNG, function(err, out) {
            // Attach file, then send.
            embed.attachFiles(
                [new Discord.MessageAttachment(out, 'hgEvent.png')]);
            // if (!battleMessage[id]) {
              msg.channel.send(message[0], embed).then((msg_) => {
                battleMessage[id] = msg_;
              });
            // } else {
            //   battleMessage[id].edit(message[0], embed);
            // }
          });
        }
      };
      let numNonUser = 0;
      for (let i = 0; i < events[index].attacks[battleState].icons.length;
           i++) {
        let outcome = events[index].attacks[battleState].victim.outcome;
        if (!events[index].attacks[battleState].icons[i].id) {
          numNonUser++;
          outcome = 'nothing';
        } else if (
            i >= events[index].attacks[battleState].numVictim + numNonUser) {
          outcome = events[index].attacks[battleState].attacker.outcome;
        }
        jimp.read(events[index].attacks[battleState].icons[i].url)
            .then(function(outcome, placement) {
              return function(image) {
                newImage(image, outcome, placement);
              };
            }(outcome, i))
            .catch(function(err) {
              console.log(err);
              responses++;
            });
      }
    }
    events[index].state++;
  } else {
    delete battleMessage[id];
    if (events[index].icons.length === 0) {
      msg.channel.send(events[index].message);
    } else {
      let embed = new Discord.MessageEmbed();
      embed.setDescription(events[index].message);
      embed.setColor([125, 0, 0]);
      let finalImage = new jimp(
          events[index].icons.length * (iconSize + iconGap) - iconGap,
          iconSize + iconGap);
      let responses = 0;
      newImage = function(image, outcome, placement) {
        image.resize(iconSize, iconSize);
        if (outcome == 'dies') {
          finalImage.blit(
              new jimp(iconSize, iconGap, 0xFF0000FF),
              placement * (iconSize + iconGap), iconSize);
        } else if (outcome == 'wounded') {
          finalImage.blit(
              new jimp(iconSize, iconGap, 0xFFFF00FF),
              placement * (iconSize + iconGap), iconSize);
        }
        finalImage.blit(image, placement * (iconSize + iconGap), 0);
        responses++;
        if (responses == events[index].icons.length) {
          finalImage.getBuffer(jimp.MIME_PNG, function(err, out) {
            embed.attachFiles(
                [new Discord.MessageAttachment(out, 'hgBattle.png')]);
            msg.channel.send(embed);
          });
        }
      };
      let numNonUser = 0;
      for (let i = 0; i < events[index].icons.length; i++) {
        let outcome = events[index].victim.outcome;
        if (!events[index].icons[i].id) {
          numNonUser++;
          outcome = 'nothing';
        } else if (i >= events[index].numVictim + numNonUser) {
          outcome = events[index].attacker.outcome;
        }
        jimp.read(events[index].icons[i].url)
            .then(function(outcome, placement) {
              return function(image) {
 newImage(image, outcome, placement);
};
            }(outcome, events[index].icons.length - i - 1))
            .catch(function(err) {
              console.log(err);
              responses++;
            });
      }
    }
    games[id].currentGame.day.state++;
  }
}
/**
 * Trigger the end of a day and print summary/outcome at the end of the day.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function printDay(msg, id) {
  let numAlive = 0;
  let lastIndex = 0;
  let lastId = 0;
  let numTeams = 0;
  let lastTeam = 0;
  let numWholeTeams = 0;
  let lastWholeTeam = 0;
  games[id].currentGame.includedUsers.forEach(function(el, i) {
    if (el.living) {
      numAlive++;
      lastIndex = i;
      lastId = el.id;
    }
  });
  if (games[id].options.teamSize > 0) {
    games[id].currentGame.teams.forEach(function(team, index) {
      if (team.numAlive > 0) {
        numTeams++;
        lastTeam = index;
      }
      if (team.numAlive == team.players.length) {
        numWholeTeams++;
        lastWholeTeam = index;
      }
    });
  }

  if (games[id].currentGame.numAlive != numAlive) {
    common.error('Realtime alive count is incorrect!', 'HG');
  }

  let finalMessage = new Discord.MessageEmbed();
  finalMessage.setColor(defaultColor);
  if (numTeams == 1) {
    let teamName = games[id].currentGame.teams[lastTeam].name;
    finalMessage.setTitle(
        '\n' + teamName + ' has won ' + games[id].currentGame.name + '!');
    finalMessage.setDescription(
        games[id]
            .currentGame.teams[lastTeam]
            .players
            .map(function(player) {
              return games[id]
                  .currentGame.includedUsers
                  .find(function(user) {
 return user.id == player;
})
                  .name;
            })
            .join(', '));
    games[id].currentGame.inProgress = false;
    games[id].currentGame.ended = true;
    games[id].autoPlay = false;
  } else if (numAlive == 1) {
    let winnerName = games[id].currentGame.includedUsers[lastIndex].name;
    let teamName = '';
    if (games[id].options.teamSize > 0) {
      teamName = '(' + games[id].currentGame.teams[lastTeam].name + ') ';
    }
    finalMessage.setTitle(
        '\n`' + winnerName + teamName + '` has won ' +
        games[id].currentGame.name + '!');
    finalMessage.setThumbnail(
        games[id].currentGame.includedUsers[lastIndex].avatarURL);
    games[id].currentGame.inProgress = false;
    games[id].currentGame.ended = true;
    games[id].autoPlay = false;
  } else if (numAlive < 1) {
    finalMessage.setTitle(
        '\nEveryone has died in ' + games[id].currentGame.name +
        '!\nThere are no winners!');
    games[id].currentGame.inProgress = false;
    games[id].currentGame.ended = true;
    games[id].autoPlay = false;
  } else if (games[id].currentGame.day.num > 0) {
    finalMessage.setTitle('Status update! (kills)');
    if (games[id].options.teamSize > 0) {
      games[id].currentGame.includedUsers.sort(function(a, b) {
        let aTeam = games[id].currentGame.teams.findIndex(function(team) {
          return team.players.findIndex(function(player) {
            return player == a.id;
          }) > -1;
        });
        let bTeam = games[id].currentGame.teams.findIndex(function(team) {
          return team.players.findIndex(function(player) {
            return player == b.id;
          }) > -1;
        });
        if (aTeam == bTeam) {
          return a.id - b.id;
        } else {
          return aTeam - bTeam;
        }
      });
    }
    let prevTeam = -1;
    let statusList = games[id].currentGame.includedUsers.map(function(obj) {
      let myTeam = -1;
      if (games[id].options.teamSize > 0) {
        myTeam = games[id].currentGame.teams.findIndex(function(team) {
          return team.players.findIndex(function(player) {
            return player == obj.id;
          }) > -1;
        });
      }
      let symbol = emoji.heart;
      if (!obj.living) symbol = emoji.skull;
      else if (obj.state == 'wounded') symbol = emoji.yellow_heart;
      else if (obj.state == 'zombie') symbol = emoji.broken_heart;

      let shortName = obj.name.substring(0, 16);
      if (shortName != obj.name) {
        shortName = shortName.substring(0, 13) + '...';
      }

      let prefix = '';
      if (myTeam != prevTeam) {
        prevTeam = myTeam;
        prefix = '__' + games[id].currentGame.teams[myTeam].name + '__\n';
      }

      return prefix + symbol + '`' + shortName + '`' +
          (obj.kills > 0 ? '(' + obj.kills + ')' : '');
    });
    if (games[id].options.teamSize == 0) {
      statusList.sort();
    }
    if (statusList.length >= 3) {
        let quarterLength = Math.floor(statusList.length / 3);
        for (let i = 0; i < 2; i++) {
          let thisMessage = statusList.splice(0, quarterLength).join('\n');
          finalMessage.addField(i + 1, thisMessage, true);
      }
      finalMessage.addField(3, statusList.join('\n'), true);
    } else {
      finalMessage.setDescription(statusList.join('\n'));
    }
    if (numWholeTeams == 1) {
      finalMessage.setFooter(
          getMessage('teamRemaining')
              .replaceAll(
                  '{}', games[id].currentGame.teams[lastWholeTeam].name));
    }
  }

  let embed = new Discord.MessageEmbed();
  if (games[id].currentGame.day.num == 0) {
    embed.setTitle(getMessage('bloodbathEnd'));
  } else {
    embed.setTitle(
        getMessage('dayEnd')
            .replaceAll('{day}', games[id].currentGame.day.num)
            .replaceAll('{alive}', numAlive));
  }
  embed.setColor(defaultColor);
  msg.channel.send(embed);

  if (numTeams == 1) {
    let sendTime = Date.now() + (games[id].options.delayDays > 2000 ? 1000 : 0);
    let winnerTag = '';
    if (games[id].options.mentionVictor) {
      winnerTag =
          games[id]
              .currentGame.teams[lastTeam]
              .players.map(function(player) {
 return '<@' + player + '>';
})
              .join(' ');
    }
    let finalImage = new jimp(
        games[id].currentGame.teams[lastTeam].players.length *
                (victorIconSize + iconGap) -
            iconGap,
        victorIconSize + iconGap);
    let responses = 0;
    newImage = function(image, userId) {
      image.resize(victorIconSize, victorIconSize);
      let user = games[id].currentGame.includedUsers.find(function(obj) {
        return obj.id == userId;
      });
      let color = 0x0;
      if (!user.living) {
        color = 0xFF0000FF;
      } else if (user.state == 'wounded') {
        color = 0xFFFF00FF;
      } else {
        color = 0x00FF00FF;
      }
      finalImage.blit(
          new jimp(victorIconSize, iconGap, color),
          responses * (victorIconSize + iconGap), victorIconSize);
      finalImage.blit(image, responses * (victorIconSize + iconGap), 0);
      responses++;
      if (responses == games[id].currentGame.teams[lastTeam].players.length) {
        finalImage.getBuffer(jimp.MIME_PNG, function(err, out) {
          finalMessage.attachFiles(
              [new Discord.MessageAttachment(out, 'hgTeamVictor.png')]);
          sendAtTime(msg.channel, winnerTag, finalMessage, sendTime);
        });
      }
    };
    games[id].currentGame.teams[lastTeam].players.forEach(function(player) {
      player = games[id].currentGame.includedUsers.find(function(obj) {
        return obj.id == player;
      });
      let icon = player.avatarURL;
      let userId = player.id;
      jimp.read(icon)
          .then(function(userId) {
            return function(image) {
              newImage(image, userId);
            };
          }(userId))
          .catch(function(err) {
            console.log(err);
            responses++;
          });
    });
  } else if (games[id].currentGame.day.num > 0) {
    client.setTimeout(function() {
      let winnerTag = '';
      if (numAlive == 1) {
        if (games[id].options.mentionVictor) {
          winnerTag = '<@' + lastId + '>';
        }
        msg.channel.send(winnerTag, finalMessage);
      } else {
        msg.channel.send(winnerTag, finalMessage);
      }
    }, (games[id].options.delayDays > 2000 ? 1000 : 0));
  }

  if (games[id].currentGame.ended) {
    let rankEmbed = new Discord.MessageEmbed();
    rankEmbed.setTitle('Final Ranks (kills)');
    let rankList =
        games[id]
            .currentGame.includedUsers
            .sort(function(a, b) {
 return a.rank - b.rank;
})
            .map(function(obj) {
              let shortName = obj.name.substring(0, 16);
              if (shortName != obj.name) {
                shortName = shortName.substring(0, 13) + '...';
              }
              return obj.rank + ') ' + shortName +
                  (obj.kills > 0 ? ' (' + obj.kills + ')' : '');
            });
    if (rankList.length <= 20) {
      rankEmbed.setDescription(rankList.join('\n'));
    } else {
      let thirdLength = Math.floor(rankList.length / 3);
      for (let i = 0; i < 2; i++) {
        let thisMessage = rankList.splice(0, thirdLength).join('\n');
        rankEmbed.addField(i + 1, thisMessage, true);
      }
      rankEmbed.addField(3, rankList.join('\n'), true);
    }
    rankEmbed.setColor(defaultColor);
    client.setTimeout(function() {
 msg.channel.send(rankEmbed);
}, 5000);
    if (games[id].options.teamSize > 0) {
      let teamRankEmbed = new Discord.MessageEmbed();
      teamRankEmbed.setTitle('Final Team Ranks');
      let teamRankList =
          games[id]
              .currentGame.teams
              .sort(function(a, b) {
                return a.rank - b.rank;
              })
              .map(function(obj) {
                return obj.rank + ') ' + obj.name;
              });
      games[id].currentGame.teams.sort(function(a, b) {
        return a.id - b.id;
      });
      if (teamRankList.length <= 20) {
        teamRankEmbed.setDescription(teamRankList.join('\n'));
      } else {
        let thirdLength = Math.floor(teamRankList.length / 3);
        for (let i = 0; i < 2; i++) {
          let thisMessage = teamRankList.splice(0, thirdLength).join('\n');
          teamRankEmbed.addField(i + 1, thisMessage, true);
        }
        teamRankEmbed.addField(3, teamRankList.join('\n'), true);
      }
      teamRankEmbed.setColor(defaultColor);
      client.setTimeout(function() {
 msg.channel.send(teamRankEmbed);
}, 8000);
    }
  }

  games[id].currentGame.day.state = 0;
  games[id].currentGame.day.events = [];

  if (games[id].autoPlay) {
    client.setTimeout(function() {
      msg.channel.send('`Autoplaying...`')
          .then((msg) => {
            msg.delete({
              timeout: games[id].options.delayDays - 1250,
              reason: 'I can do whatever I want!',
            });
          })
          .catch(() => {});
    }, (games[id].options.delayDays > 2000 ? 1200 : 100));
    client.setTimeout(function() {
      nextDay(msg, id);
    }, games[id].options.delayDays);
  } else {
    command.enable('say', msg.channel.id);
  }
}
/**
 * End a game early.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function endGame(msg, id) {
  if (!games[id] || !games[id].currentGame.inProgress) {
    reply(msg, 'There isn\'t a game in progress.');
  } else {
    reply(msg, 'The game has ended!');
    games[id].currentGame.inProgress = false;
    games[id].currentGame.ended = true;
    games[id].autoPlay = false;
    client.clearInterval(intervals[id]);
    delete intervals[id];
    delete battleMessage[id];
    command.enable('say', games[id].outputChannel);
  }
}

// User Management //
/**
 * Remove a user from users to be in next game.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function excludeUser(msg, id) {
  if (msg.mentions.users.size == 0) {
    reply(
        msg,
        'You must mention people you wish for me to exclude from the next game.');
  } else {
    let response = '';
    msg.mentions.users.forEach(function(obj) {
      if (games[id].excludedUsers.includes(obj.id)) {
        response += obj.username + ' is already excluded.\n';
      } else {
        games[id].excludedUsers.push(obj.id);
        response += obj.username + ' added to blacklist.\n';
        if (!games[id].currentGame.inProgress) {
          let index =
              games[id].currentGame.includedUsers.findIndex(function(el) {
                return el.id == obj.id;
              });
          if (index >= 0) {
            games[id].currentGame.includedUsers.splice(index, 1);
            response += obj.username + ' removed from included players.\n';
            formTeams(id);
          } else {
            common.error(
                'Failed to remove player from included list. (' + obj.id + ')',
                'HG');
          }
        }
      }
    });
    reply(msg, response);
  }
}

/**
 * Add a user back into the next game.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function includeUser(msg, id) {
  if (msg.mentions.users.size == 0) {
    reply(
        msg,
        'You must mention people you wish for me to include in the next game.');
  } else {
    let response = '';
    msg.mentions.users.forEach(function(obj) {
      if (!games[id].options.includeBots && obj.user.bot) {
        response += obj.username + ' is a bot, but bots are disabled.\n';
        return;
      }
      let excludeIndex = games[id].excludedUsers.indexOf(obj.id);
      if (excludeIndex >= 0) {
        response += obj.username + ' removed from blacklist.\n';
        games[id].excludedUsers.splice(excludeIndex, 1);
      }
      if (games[id].currentGame.inProgress) {
        response += obj.username + ' skipped.\n';
      } else {
        games[id].currentGame.includedUsers.push(
            new Player(
                obj.id, obj.username, obj.displayAvatarURL({format: 'png'})));
        response += obj.username + ' added to included players.\n';
        formTeams(id);
      }
    });
    if (games[id].currentGame.inProgress) {
      response +=
          'Players were skipped because a game is currently in progress. Players cannot be added to a game while it\'s in progress.';
    }
    reply(msg, response);
  }
}

/**
 * Show a formatted message of all users and teams in current server.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function listPlayers(msg, id) {
  let stringList = '';
  if (games[id] && games[id].currentGame &&
      games[id].currentGame.includedUsers) {
    stringList += '=== Included Players (' +
        games[id].currentGame.includedUsers.length + ') ===\n';
    if (games[id].options.teamSize == 0) {
      stringList += games[id].currentGame.includedUsers.map(function(obj) {
        return obj.name;
      }).join(', ');
    } else {
      let numPlayers = 0;
      stringList +=
          games[id]
              .currentGame.teams
              .map(function(team, index) {
                return '#' + (index + 1) + ' __' + team.name + '__: ' +
                    team.players
                        .map(function(player) {
                          numPlayers++;
                          try {
                            return '`' +
                                games[id]
                                    .currentGame.includedUsers
                                    .find(function(obj) {
                                      return obj.id == player;
                                    })
                                    .name +
                                '`';
                          } catch (err) {
                            common.error(
                                'Failed to find player ' + player +
                                ' in included users.');
                            console.log(games[id].currentGame.includedUsers);
                            throw err;
                          }
                        })
                        .join(', ');
              })
              .join('\n');
      if (numPlayers != games[id].currentGame.includedUsers.length) {
        stringList +=
            '\n\nSome players were left out! Please reset teams to fix this! (' +
            numPlayers + '/' + games[id].currentGame.includedUsers.length + ')';
        common.error(
            'Failed to list all players! ' + numPlayers + '/' +
            games[id].currentGame.includedUsers.length + ': ' + id);
      }
    }
  } else {
    stringList +=
        'There don\'t appear to be any included players. Have you created a game with "' +
        myPrefix + 'create"?';
  }
  if (games[id] && games[id].excludedUsers &&
      games[id].excludedUsers.length > 0) {
    stringList +=
        `\n\n=== Excluded Players (${games[id].excludedUsers.length}) ===\n`;
    stringList +=
        games[id].excludedUsers.map(function(obj) {
          return getName(msg, obj);
        }).join(', ');
  }
  reply(msg, 'List of currently tracked players:', stringList);
}

/**
 * Get the username of a user id if available, or their id if they couldn't be
 * found.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} user The id of the user to find the name of.
 * @return {string} The user's name or id if name was unable to be found.
 */
function getName(msg, user) {
  let name = '';
  if (msg.guild.members.get(user)) {
    name = msg.guild.members.get(user).user.username;
  } else {
    name = user;
  }
  return name;
}

/**
 * Change an option to a value that the user specifies.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function toggleOpt(msg, id) {
  let option = msg.text.split(' ')[0];
  let value = msg.text.split(' ')[1];
  if (!games[id] || !games[id].currentGame) {
    reply(
        msg, 'You must create a game first before editing settings! Use "' +
            myPrefix + 'create" to create a game.');
  } else if (typeof option === 'undefined' || option.length == 0) {
    showOpts(msg, games[id].options);
  } else if (games[id].currentGame.inProgress) {
    reply(
        msg, 'You must end this game before changing settings. Use "' +
            myPrefix + 'end" to abort this game.');
  } else if (typeof defaultOptions[option] === 'undefined') {
    reply(
        msg,
        'That is not a valid option to change! (Delays are in milliseconds)' +
            JSON.stringify(games[id].options, null, 1)
                .replace('{', '')
                .replace('}', ''));
  } else {
    let type = typeof defaultOptions[option].value;
    if (type === 'number') {
      value = Number(value);
      if (typeof value !== 'number') {
        reply(
            msg, 'That is not a valid value for ' + option +
                ', which requires a number. (Currently ' +
                games[id].options[option] + ')');
      } else {
        if ((option == 'delayDays' || option == 'delayEvents') && value < 500) {
          value = 1000;
        }

        let old = games[id].options[option];
        games[id].options[option] = value;
        reply(
            msg, 'Set ' + option + ' to ' + games[id].options[option] +
                ' from ' + old);
        if (option == 'teamSize' && value != 0) {
          reply(
              msg, 'To reset teams to the correct size, type "' + myPrefix +
                  'teams reset".\nThis will delete all teams, and create new ones.');
        }
      }
    } else if (type === 'boolean') {
      if (value === 'true' || value === 'false') value = value === 'true';
      if (typeof value !== 'boolean') {
        reply(
            msg, 'That is not a valid value for ' + option +
                ', which requires true or false. (Currently ' +
                games[id].options[option] + ')');
      } else {
        let old = games[id].options[option];
        games[id].options[option] = value;
        reply(
            msg, 'Set ' + option + ' to ' + games[id].options[option] +
                ' from ' + old);
        if (option == 'includeBots') {
          createGame(msg, id, true);
        }
      }
    } else if (type === 'string') {
      if (defaultOptions[option].values.lastIndexOf(value) < 0) {
        reply(
            msg, 'That is not a valid value for ' + option +
                ', which requires one of the following: ' +
                JSON.stringify(defaultOptions[option].values) +
                '. (Currently ' + games[id].options[option] + ')');
      } else {
        let old = games[id].options[option];
        games[id].options[option] = value;
        reply(
            msg, 'Set ' + option + ' to ' + games[id].options[option] +
                ' from ' + old);
      }
    } else {
      reply(
          msg,
          'Changing the value of this option is not added yet. (' + type + ')');
    }
  }
}
/**
 * Format the options for the games and show them to the user.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {Object} options The options to format.
 */
function showOpts(msg, options) {
  const entries = Object.entries(options);

  let bodyList = entries.map(function(obj) {
    let key = obj[0];
    let val = obj[1];

    return key + ': ' + val + ' (default: ' +
        defaultOptions[key].value + ')\n' + '/* ' +
        defaultOptions[key].comment + ' */';
  });

  let totalLength = 0;
  let bodyFields = [[]];
  let fieldIndex = 0;
  for (let i in bodyList) {
    if (bodyList[i].length + totalLength > 1500) {
      fieldIndex++;
      totalLength = 0;
      bodyFields[fieldIndex] = [];
    }
    totalLength += bodyList[i].length;
    bodyFields[fieldIndex].push(bodyList[i]);
  }

  let page = 0;
  if (msg.optId) page = msg.optId;
  if (page < 0) page = 0;
  if (page >= bodyFields.length) page = bodyFields.length - 1;

  let embed = new Discord.MessageEmbed();
  embed.setTitle('Current Options');
  embed.setFooter('Page ' + (page + 1) + ' of ' + (bodyFields.length));
  embed.setDescription('```js\n' + bodyFields[page].join('\n\n') + '```');
  embed.addField(
      'Change Number Example', myPrefix + 'options probabilityOfResurrect 0.1',
      true);
  embed.addField(
      'Change Boolean Example', myPrefix + 'options teammatesCollaborate true',
      true);

  if (optionMessages[msg.id]) {
    msg.edit(embed).then((msg_) => {
      msg_.origAuth = msg.origAuth;
      optChangeListener(msg_, options, page);
    });
  } else {
    msg.channel.send(embed).then((msg_) => {
      msg_.origAuth = msg.author.id;
      optChangeListener(msg_, options, page);
    });
  }
}

/**
 * The callback for when the user chooses to change page of the options.
 *
 * @param {Discord.Message} msg_ The message we sent showing the options.
 * @param {Object} options The options to show in the message.
 * @param {number} index The page index to show.
 */
function optChangeListener(msg_, options, index) {
  msg_.optId = index;
  optionMessages[msg_.id] = msg_;
  msg_.react(emoji.arrow_left).then(() => {
    msg_.react(emoji.arrow_right);
  });
  msg_.awaitReactions(function(reaction, user) {
        if (user.id != client.user.id) reaction.users.remove(user);
        return (reaction.emoji.name == emoji.arrow_right ||
                reaction.emoji.name == emoji.arrow_left) /* &&
            user.id == msg_.origAuth*/ &&
            user.id != client.user.id;
      }, {max: 1, time: maxReactAwaitTime}).then(function(reactions) {
        if (reactions.size == 0) {
          msg_.reactions.removeAll();
          delete optionMessages[msg_.id];
          return;
    }
    let name = reactions.first().emoji.name;
    if (name == emoji.arrow_right) {
      msg_.optId++;
    } else if (name == emoji.arrow_left) {
      msg_.optId--;
    }
    showOpts(msg_, options);
  });
}

// Team Management //
/**
 * Entry for all team commands.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function editTeam(msg, id) {
  let split = msg.text.split(' ');
  if (games[id].currentGame.inProgress) {
    switch (split[0]) {
      case 'swap':
      case 'reset':
        msg.channel.send(
            mention(msg) +
            ' `You must end the current game before editing teams.`');
        return;
    }
  }
  switch (split[0]) {
    case 'swap':
      swapTeamUsers(msg, id);
      break;
    case 'move':
      moveTeamUser(msg, id);
      break;
    case 'rename':
      renameTeam(msg, id);
      break;
    case 'reset':
      reply(msg, 'Resetting ALL teams!');
      games[id].currentGame.teams = [];
      formTeams(id);
      break;
    case 'randomize':
      randomizeTeams(msg, id);
      break;
    default:
      listPlayers(msg, id);
      break;
  }
}
/**
 * Swap two users from one team to the other.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function swapTeamUsers(msg, id) {
  if (msg.mentions.users.size != 2) {
    reply(msg, 'Swapping requires mentioning 2 users to swap teams with eachother.');
    return;
  }
  let user1 = msg.mentions.users.first().id;
  let user2 = msg.mentions.users.first(2)[1].id;
  let teamId1 = 0;
  let playerId1 = 0;
  let teamId2 = 0;
  let playerId2 = 0;
  teamId1 = games[id].currentGame.teams.findIndex(function(team) {
    let index =
        team.players.findIndex(function(player) {
 return player == user1;
});
    if (index > -1) playerId1 = index;
    return index > -1;
  });
  teamId2 = games[id].currentGame.teams.findIndex(function(team) {
    let index =
        team.players.findIndex(function(player) {
 return player == user2;
});
    if (index > -1) playerId2 = index;
    return index > -1;
  });
  if (teamId1 < 0 || teamId2 < 0) {
    reply(msg, 'Please ensure both users are on a team.');
    return;
  }
  let intVal = games[id].currentGame.teams[teamId1].players[playerId1];
  games[id].currentGame.teams[teamId1].players[playerId1] =
      games[id].currentGame.teams[teamId2].players[playerId2];

  games[id].currentGame.teams[teamId2].players[playerId2] = intVal;

  reply(msg, 'Swapped players!');
}
/**
 * Move a single user to another team.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function moveTeamUser(msg, id) {
  if (msg.mentions.users.size < 1) {
    reply(msg, 'You must at least mention one user to move.');
    return;
  }
  let user1 = msg.mentions.users.first().id;
  let teamId1 = 0;
  let playerId1 = 0;

  let user2 = 0;
  if (msg.mentions.users.size >= 2) {
    user2 = msg.mentions.users.first(2)[1].id;

    if (msg.text.indexOf(user2) < msg.text.indexOf(user1)) {
      let intVal = user1;
      user1 = user2;
      user2 = intVal;
    }
  }

  let teamId2 = 0;
  teamId1 = games[id].currentGame.teams.findIndex(function(team) {
    let index = team.players.findIndex(function(player) {
      return player == user1;
    });
    if (index > -1) playerId1 = index;
    return index > -1;
  });
  if (user2 > 0) {
    teamId2 = games[id].currentGame.teams.findIndex(function(team) {
      return team.players.findIndex(function(player) {
        return player == user2;
      }) > -1;
    });
  } else {
    teamId2 = msg.text.split(' ')[2] - 1;
  }
  if (teamId1 < 0 || teamId2 < 0 || isNaN(teamId2)) {
    reply(msg, 'Please ensure the first option is the user, and the second is the destination (either a mention or a team id).');
    console.log(teamId1, teamId2);
    return;
  }
  if (teamId2 >= games[id].currentGame.teams.length) {
    games[id].currentGame.teams.push(
        new Team(
            games[id].currentGame.teams.length,
            'Team ' + (games[id].currentGame.teams.length + 1), []));
    teamId2 = games[id].currentGame.teams.length - 1;
  }
  reply(
      msg, 'Moving `' + msg.mentions.users.first().username + '` from ' +
          games[id].currentGame.teams[teamId1].name + ' to ' +
          games[id].currentGame.teams[teamId2].name);

  games[id].currentGame.teams[teamId2].players.push(
      games[id].currentGame.teams[teamId1].players.splice(playerId1, 1)[0]);

  if (games[id].currentGame.teams[teamId1].players.length == 0) {
    games[id].currentGame.teams.splice(teamId1, 1);
  }
}
/**
 * Rename a team.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function renameTeam(msg, id) {
  let split = msg.text.split(' ').slice(1);
  let message = split.slice(1).join(' ');
  let search = Number(split[0]);
  if (isNaN(search) && msg.mentions.users.size == 0) {
    reply(msg, 'Please specify a team id, or mention someone on a team, in order to rename their team.');
    return;
  }
  let teamId = search - 1;
  if (isNaN(search)) {
    teamId = games[id].currentGame.teams.findIndex(function(team) {
      return team.players.findIndex(function(player) {
        return player == msg.mentions.users.first().id;
      }) > -1;
    });
  }
  if (teamId < 0 || teamId >= games[id].currentGame.teams.length) {
    reply(
        msg, 'Please specify a valid team id. (0-' +
            (games[id].currentGame.teams.length - 1) + ')');
    return;
  }
  reply(
      msg, 'Renaming "' + games[id].currentGame.teams[teamId].name +
          '" to "' + message + '"');
  games[id].currentGame.teams[teamId].name = message;
}

/**
 * Swap random users between teams.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function randomizeTeams(msg, id) {
  let current = games[id].currentGame;
  for (let i = 0; i < current.includedUsers.length; i++) {
    let teamId1 = Math.floor(Math.random() * current.teams.length);
    let playerId1 =
        Math.floor(Math.random() * current.teams[teamId1].players.length);
    let teamId2 = Math.floor(Math.random() * current.teams.length);
    let playerId2 =
        Math.floor(Math.random() * current.teams[teamId2].players.length);

    let intVal = current.teams[teamId1].players[playerId1];
    current.teams[teamId1].players[playerId1] =
        current.teams[teamId2].players[playerId2];
    current.teams[teamId2].players[playerId2] = intVal;
  }
  reply(msg, 'Teams have been randomized!');
}

// Game Events //
/**
 * Create a custom event for a guild.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function createEvent(msg, id) {
  newEventMessages[msg.id] = msg;
  const authId = msg.author.id;
  reply(msg, 'Loading...').then((msg_) => {
    newEventMessages[msg.id].myResponse = msg_;
    msg_.awaitReactions(function(reaction, user) {
          return (reaction.emoji.name == emoji.red_circle ||
                  reaction.emoji.name == emoji.trophy) &&
              user.id == authId;
        }, {max: 1, time: maxReactAwaitTime}).then(function(reactions) {
      if (reactions.size == 0) {
        msg_.reactions.removeAll();
        delete newEventMessages[msg.id];
        return;
      }
      let eventType = 'player';
      if (reactions.first().emoji.name == emoji.red_circle) {
        eventType = 'bloodbath';
      }
      const message = newEventMessages[msg.id].text;
      msg_.delete();
      msg.channel.send('Loading...').then(function(msg_) {
        let numVictim = 0;
        let numAttacker = 0;
        let victimOutcome = 'nothing';
        let attackerOutcome = 'nothing';
        let victimKiller = false;
        let attackerKiller = false;
        getAttackNum = function() {
          createEventNums(
              msg_, authId,
              '`How many attackers may be in this event? (-1 means at least 1, -2 at least 2)`',
              (num) => {
                numAttacker = num;
                // msg_.reactions.removeAll();
                msg_.channel.send('Loading...').then((msg) => {
                  msg_ = msg;
                  getVictimNum();
                });
                msg_.delete();
              });
        };
        getVictimNum = function() {
          createEventNums(
              msg_, authId,
              '`How many victims may be in this event? (-1 means at least 1, -2 at least 2)`',
              (num) => {
                numVictim = num;
                // msg_.reactions.removeAll();
                msg_.channel.send('Loading...').then((msg) => {
                  msg_ = msg;
                  getAttackOutcome();
                });
                msg_.delete();
              });
        };
        getAttackOutcome = function() {
          if (numAttacker == 0) {
            getVictimOutcome();
          } else {
            createEventOutcome(
                msg_, authId, '`What is the outcome of the attackers?`',
                function(outcome) {
                  attackerOutcome = outcome;
                  // msg_.reactions.removeAll();
                  msg_.channel.send('Loading...').then((msg) => {
                    msg_ = msg;
                    getVictimOutcome();
                  });
                  msg_.delete();
                });
          }
        };
        getVictimOutcome = function() {
          if (numVictim == 0) {
            getIsAttackerKiller();
          } else {
            createEventOutcome(
                msg_, authId, '`What is the outcome of the victims?`',
                function(outcome) {
                  victimOutcome = outcome;
                  // msg_.reactions.removeAll();
                  msg_.channel.send('Loading...').then((msg) => {
                    msg_ = msg;
                    getIsAttackerKiller();
                  });
                  msg_.delete();
                });
          }
        };
        getIsAttackerKiller = function() {
          if (numAttacker == 0) {
            getIsVictimKiller();
          } else {
            createEventAttacker(
                msg_, authId,
                '`Do the attacker(s) kill someone in this event?`',
                function(outcome) {
                  attackerKiller = outcome;
                  // msg_.reactions.removeAll();
                  msg_.channel.send('Loading...').then((msg) => {
                    msg_ = msg;
                    getIsVictimKiller();
                  });
                  msg_.delete();
                });
          }
        };
        getIsVictimKiller = function() {
          if (numVictim == 0) {
            finish();
          } else {
            createEventAttacker(
                msg_, authId, '`Do the victim(s) kill someone in this event?`',
                function(outcome) {
                  victimKiller = outcome;
                  finish();
                });
          }
        };
        finish = function() {
          msg_.delete();
          let newEvent = new Event(
              message, numVictim, numAttacker, victimOutcome, attackerOutcome,
              victimKiller, attackerKiller);
          msg.channel.send(
              '`Event created!`\n' + formatEventString(newEvent) + '\n' +
              eventType + ' event');
          if (eventType == 'bloodbath') {
            games[id].customEvents.bloodbath.push(newEvent);
          } else {
            games[id].customEvents.player.push(newEvent);
          }
        };

        getAttackNum();
      });
      delete newEventMessages[msg.id];
    });
    msg_.react(emoji.red_circle).then(() => {
      msg_.react(emoji.trophy);
    });
    updateEventPreview(newEventMessages[msg.id]);
  });
}
/**
 * The callback after receiving a number from user input.
 *
 * @callback createEventNumCallback
 * @param {number} num The number received from the user.
 */

/**
 * Let the user choose how many of something will be in this event being
 * created.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 * @param {string} show The message to show explainig the number.
 * @param {createEventNumCallback} cb The callback after the user has chosen a
 * number.
 */
function createEventNums(msg, id, show, cb) {
  msg.edit(show + '\nNo people');

  let num = 0;
  regLis = function() {
    msg.awaitReactions(function(reaction, user) {
         if (user.id != client.user.id) reaction.users.remove(user);
         return (reaction.emoji.name == emoji.arrow_up ||
                 reaction.emoji.name == emoji.arrow_down ||
                 reaction.emoji.name == emoji.white_check_mark) &&
             user.id == id;
       }, {max: 1, time: maxReactAwaitTime}).then(function(reactions) {
         if (reactions.size == 0) {
           msg.reactions.removeAll();
           return;
      }
      let name = reactions.first().emoji.name;
      if (name == emoji.arrow_up) {
        num++;
      } else if (name == emoji.arrow_down) {
        num--;
      } else if (name == emoji.white_check_mark) {
        cb(num);
        return;
      }
      let message = 'No people.';
      if (num < 0) message = 'At least ' + num * -1 + ' people.';
      else if (num > 0) message = num + ' people exactly.';
      msg.edit(show + '\n' + message);
      regLis();
    });
  };

  regLis();

  msg.react(emoji.white_check_mark).then(() => {
    msg.react(emoji.arrow_up).then(() => {
      msg.react(emoji.arrow_down);
    });
  });
}
/**
 * The callback after receiving an event outcome from a user.
 *
 * @callback createEventOutcomeCallback
 * @param {string} outcome The outcome chosen by the user.
 */

/**
 * Let the user choose what the outcome of an event will be.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 * @param {string} show The message to show explainig the options.
 * @param {createEventOutcomeCallback} cb The callback after the user has chosen
 * an outcome.
 */
function createEventOutcome(msg, id, show, cb) {
  msg.edit(
      show + '\n' + getOutcomeEmoji('nothing') + 'Nothing, ' +
      getOutcomeEmoji('dies') + 'Dies, ' + getOutcomeEmoji('wounded') +
      'Wounded, ' + getOutcomeEmoji('thrives') + 'Healed');

  msg.awaitReactions(function(reaction, user) {
       return (reaction.emoji.name == getOutcomeEmoji('thrives') ||
               reaction.emoji.name == getOutcomeEmoji('wounded') ||
               reaction.emoji.name == getOutcomeEmoji('nothing') ||
               reaction.emoji.name == getOutcomeEmoji('dies')) &&
           user.id == id;
     }, {max: 1, time: maxReactAwaitTime}).then(function(reactions) {
    if (reactions.size == 0) {
      msg.reactions.removeAll();
      return;
    }
    switch (reactions.first().emoji.name) {
      case getOutcomeEmoji('thrives'):
        cb('thrives');
        return;
      case getOutcomeEmoji('wounded'):
        cb('wounded');
        return;
      case getOutcomeEmoji('nothing'):
        cb('nothing');
        return;
      case getOutcomeEmoji('dies'):
        cb('dies');
        return;
    }
  });

  msg.react(getOutcomeEmoji('nothing')).then(() => {
    msg.react(getOutcomeEmoji('dies')).then(() => {
      msg.react(getOutcomeEmoji('wounded')).then(() => {
        msg.react(getOutcomeEmoji('thrives'));
      });
    });
  });
}
/**
 * The callback after receiving a boolean input.
 *
 * @callback createEventBooleanCallback
 * @param {boolean} outcome The value chosen by the user.
 */

/**
 * Let the user choose whether the event attackers and victims kill anyone.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 * @param {string} show The message to show explainig the options.
 * @param {createEventBooleanCallback} cb The callback after the user has chosen
 * an outcome.
 */
function createEventAttacker(msg, id, show, cb) {
  msg.edit(show);

  msg.awaitReactions(function(reaction, user) {
       return (reaction.emoji.name == emoji.white_check_mark ||
               reaction.emoji.name == emoji.x) &&
           user.id == id;
     }, {max: 1, time: maxReactAwaitTime}).then(function(reactions) {
    if (reactions.size == 0) {
      msg.reactions.removeAll();
      return;
    }
    if (reactions.first().emoji.name == emoji.white_check_mark) {
      cb(true);
    } else {
      cb(false);
    }
  });

  msg.react(emoji.white_check_mark).then(() => {
    msg.react(emoji.x);
  });
}

/**
 * When a user is creating a custom event and edits their message, we need to edit the preview.
 *
 * @param {Discord.Message} msg Our message previewing the new event.
 */
function updateEventPreview(msg) {
  msg.text = msg.text.split(' ').slice(1).join(' ');
  let helpMsg =
      '```\nEdit your message until you are happy with the below outcomes, then click the type of event.\n' +
      '\nReplace names with "{victim}" or "{attacker}" (with brackets).\n' +
      '\nUse "[Vsinglular|plural]" or "[Asingular|plural]" to put "singular" if there\'s only one person, or "plural" if there are more' +
      '\n (A for attacker, V for victim).\n```';
  let finalOptionsHelp =
      emoji.red_circle + 'Bloodbath event, ' + emoji.trophy + 'Normal event.';
  let users = msg.guild.members.random(4);
  let players = [];
  let cnt = 0;
  for (let i = 0; cnt < 4; i++) {
    let nextUser = users[i % users.length];
    if (typeof nextUser === 'undefined') continue;
    players.push(makePlayer(nextUser.user));
    cnt++;
  }
  try {
    let single = makeSingleEvent(
                     msg.text, players.slice(0), 1, 1, false, msg.guild.id,
                     'nothing', 'nothing')
                     .message;
    let pluralOne = makeSingleEvent(
                        msg.text, players.slice(0), 2, 1, false, msg.guild.id,
                        'nothing', 'nothing')
                        .message;
    let pluralTwo = makeSingleEvent(
                        msg.text, players.slice(0), 1, 2, false, msg.guild.id,
                        'nothing', 'nothing')
                        .message;
    let pluralBoth = makeSingleEvent(
                         msg.text, players.slice(0), 2, 2, false, msg.guild.id,
                         'nothing', 'nothing')
                         .message;
    msg.myResponse.edit(
        helpMsg + single + '\n' + pluralOne + '\n' + pluralTwo + '\n' +
        pluralBoth + '\n\n' + finalOptionsHelp);
  } catch (err) {
    console.log(err);
  }
}
/**
 * Delete a custom event from a guild.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function removeEvent(msg, id) {
  const split = msg.text.split(' ');

  if (split.length == 1) {
    reply(
        msg,
        'You must specify the number of the custom event you wish to remove.');
    return;
  } else if (isNaN(split[1])) {
    reply(msg, 'The number you specified, isn\'t a number, please pick a number.');
    return;
  } else if (split[1] <= 0) {
    reply(msg, 'The number you chose, is a bad number. I don\'t like it.');
    return;
  }

  const num = split[1] - 1;

  reply(msg, 'Which type of event is this?',
      emoji.red_circle + 'Bloodbath, ' + emoji.trophy + 'Normal.').then((msg_) => {
    msg_.awaitReactions(function(reaction, user) {
      return user.id == msg.author.id &&
              (reaction.emoji.name == emoji.red_circle ||
               reaction.emoji.name == emoji.trophy);
    }, {max: 1, time: maxReactAwaitTime}).then(function(reactions) {
      if (reactions.size == 0) {
        msg_.reactions.removeAll();
        return;
      }
      let eventType = 'player';
      if (reactions.first().emoji.name == emoji.red_circle) {
        eventType = 'bloodbath';
      }

      if (eventType == 'player') {
        if (num >= games[id].customEvents.player.length) {
          reply(
              msg,
              'That number is a really big scary number. Try a smaller one.');
          msg_.delete();
        } else {
          const removed = games[id].customEvents.player.splice(num, 1)[0];
          reply(msg, 'Removed event.', formatEventString(removed, true));
          msg_.delete();
        }
      } else {
        if (num >= games[id].customEvents.bloodbath.length) {
          reply(
              msg,
              'That number is a really big scary number. Try a smaller one.');
          msg_.delete();
        } else {
          const removed = games[id].customEvents.bloodbath.splice(num, 1)[0];
          reply(msg, 'Removed event.', formatEventString(removed, true));
          msg_.delete();
        }
      }
    });

    msg_.react(emoji.red_circle).then(() => {
      msg_.react(emoji.trophy);
    });
  });
}
/**
 * Put information about an array of events into the array.
 *
 * @param {Event[]} events Array of events to process and modify.
 */
function fetchStats(events) {
  let numKill = 0;
  let numWound = 0;
  let numThrive = 0;
  events.forEach(function(obj) {
    if (obj.attacker.outcome == 'dies' || obj.victim.outcome == 'dies') {
      numKill++;
    }
    if (obj.attacker.outcome == 'wounded' || obj.victim.outcome == 'wounded') {
      numWound++;
    }
    if (obj.attacker.outcome == 'thrives' || obj.victim.outcome == 'thrives') {
      numThrive++;
    }
  });
  events.numKill = numKill;
  events.numWound = numWound;
  events.numThrive = numThrive;
}
/**
 * Allow user to view all events available on their server and summary of each
 * type of event.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 * @param {number} [page=0] The page number to show.
 * @param {string} [eventType='player'] The type of event to show.
 * @param {Discord.Message} [editMsg] The message to edit instead of sending a
 * new message.
 */
function listEvents(msg, id, page, eventType, editMsg) {
  let embed = new Discord.MessageEmbed();

  let events = [];
  let numCustomEvents = 0;
  let title;
  if (!eventType) eventType = 'player';
  if (eventType == 'player') {
    if (games[id].customEvents.player) {
      events = games[id].customEvents.player.slice(0);
      numCustomEvents = games[id].customEvents.player.length;
    }
    events.push(
        new Event(emoji.arrow_up + 'Custom | Default' + emoji.arrow_down));
    events = events.concat(defaultPlayerEvents);
    title = 'Player';
    fetchStats(events);
    embed.setColor([0, 255, 0]);
  } else if (eventType == 'bloodbath') {
    if (games[id].customEvents.bloodbath) {
      events = games[id].customEvents.bloodbath.slice(0);
      numCustomEvents = games[id].customEvents.bloodbath.length;
    }
    events.push(
        new Event(emoji.arrow_up + 'Custom | Default' + emoji.arrow_down));
    events = events.concat(defaultBloodbathEvents);
    title = 'Bloodbath';
    fetchStats(events);
    embed.setColor([255, 0, 0]);
  } else if (eventType == 'arena') {
    if (games[id].customEvents.arena) {
      events = games[id].customEvents.arena.slice(0);
      numCustomEvents = games[id].customEvents.arena.length;
    }
    if (numCustomEvents == 0 && page <= 0) {
      page = 1;
    }
    events.push(
        new Event(emoji.arrow_up + 'Custom | Default' + emoji.arrow_down));
    events = events.concat(defaultArenaEvents);

    events = events.map(function(obj, i) {
      if (obj.outcomes) {
        fetchStats(obj.outcomes);

        return new Event(
            '**___' + obj.message + '___** (' +
            Math.round(obj.outcomes.numKill / obj.outcomes.length * 1000) / 10 +
            '% kill, ' +
            Math.round(obj.outcomes.numWound / obj.outcomes.length * 1000) / 10 +
            '% wound, ' +
            Math.round(obj.outcomes.numThrive / obj.outcomes.length * 1000) / 10 +
            '% heal.)\n' +
            obj.outcomes
                .map(function(outcome, index) {
                  return alph[index] + ') ' + formatEventString(outcome, true);
                })
                .join('\n'));
      } else {
        obj.message = '**___' + obj.message + '___**';
        return obj;
      }
    });
    title = 'Arena';
    embed.setColor([0, 0, 255]);
  } else {
    common.error('HOW COULD THIS BE? I\'ve made a mistake!', 'HG');
  }

  const numEvents = events.length;
  const numThisPage = eventType == 'arena' ? 1 : numEventsPerPage;
  const numPages = Math.ceil(numEvents / numThisPage);
  if (page * numThisPage >= numEvents) {
    page = numPages - 1;
  } else if (page < 0) {
    page = 0;
  }

  let fullTitle = 'All ' + title + ' Events (' + (numEvents - 1) + ') ';
  if (eventType != 'arena') {
    fullTitle += Math.round(events.numKill / events.length * 1000) / 10 +
        '% kill, ' + Math.round(events.numWound / events.length * 1000) / 10 +
        '% wound, ' + Math.round(events.numThrive / events.length * 1000) / 10 +
        '% heal.';
  }
  embed.setTitle(fullTitle);
  embed.setFooter('(Page: ' + (page + 1) + '/' + numPages + ')');

  embed.setDescription(
      events.slice(page * numThisPage, (page + 1) * numThisPage)
          .map(function(obj, index) {
            let num = (index + 1 + numThisPage * page);
            if (eventType == 'arena') {
              num = 0;
            } else {
              // Not equal to because we are 1 indexed, not 0.
              if (num > numCustomEvents) num -= numCustomEvents + 1;
            }

            if (num == 0) {
              return obj.message;
            } else {
              return num + ') ' + formatEventString(obj, true);
            }
          })
          .join('\n'));

  callback = function(msg_) {
    msg_.awaitReactions(function(reaction, user) {
          if (user.id != client.user.id) reaction.users.remove(user);
          return user.id == msg.author.id &&
              (reaction.emoji.name == emoji.arrow_right ||
               reaction.emoji.name == emoji.arrow_left ||
               reaction.emoji.name == emoji.arrow_double_right ||
               reaction.emoji.name == emoji.arrow_double_left ||
               reaction.emoji.name == emoji.arrows_counterclockwise);
        }, {max: 1, time: maxReactAwaitTime}).then(function(reactions) {
      if (reactions.size == 0) {
        msg_.reactions.removeAll();
        return;
      }
      switch (reactions.first().emoji.name) {
        case emoji.arrow_right:
          listEvents(msg, id, page + 1, eventType, msg_);
          break;
        case emoji.arrow_left:
          listEvents(msg, id, page - 1, eventType, msg_);
          break;
        case emoji.arrow_double_right:
          listEvents(msg, id, numPages - 1, eventType, msg_);
          break;
        case emoji.arrow_double_left:
          listEvents(msg, id, 0, eventType, msg_);
          break;
        case emoji.arrows_counterclockwise:
          if (eventType == 'player') {
            eventType = 'arena';
          } else if (eventType == 'arena') {
            eventType = 'bloodbath';
          } else if (eventType == 'bloodbath') {
            eventType = 'player';
          }
          listEvents(msg, id, 0, eventType, msg_);
          break;
      }
    });

    let myReactions = msg_.reactions.filter(function(obj) {
      return obj.me;
    });
    if (!myReactions.exists('name', emoji.arrow_right) ||
        !myReactions.exists('name', emoji.arrow_left) ||
        !myReactions.exists('name', emoji.arrow_double_right) ||
        !myReactions.exists('name', emoji.arrow_double_left) ||
        !myReactions.exists('name', emoji.arrows_counterclockwise)) {
      msg_.react(emoji.arrow_double_left).then(() => {
        msg_.react(emoji.arrow_left).then(() => {
          msg_.react(emoji.arrow_right).then(() => {
            msg_.react(emoji.arrow_double_right).then(() => {
              msg_.react(emoji.arrows_counterclockwise);
            });
          });
        });
      }).catch(console.log);
    }
  };

  if (!editMsg) msg.channel.send(embed).then(callback);
  else editMsg.edit(embed).then(callback);
}

/**
 * Format an event to show its settings to the user.
 *
 * @param {Event} arenaEvent The event to format.
 * @param {boolean} [newline=false] If a new line should be inserted for better
 * formatting.
 * @return {string} The formatted message with emojis.
 */
function formatEventString(arenaEvent, newline) {
  let message = arenaEvent.message.replaceAll('{attacker}', '`attacker`')
                    .replaceAll('{victim}', '`victim`')
                    .replaceAll('{dead}', '`dead`');
  if (newline) message += '\n    ';
  message += '(' + emoji.crossed_swords + ': ' + arenaEvent.attacker.count;
  if (arenaEvent.attacker.count != 0) {
    message += ', ' + getOutcomeEmoji(arenaEvent.attacker.outcome) +
        (arenaEvent.attacker.killer ? ' Killer ' : '');
  }
  message += ')';
  if (newline) message += '\n    ';
  message += '(' + emoji.shield + ': ' + arenaEvent.victim.count;
  if (arenaEvent.victim.count != 0) {
    message += ', ' + getOutcomeEmoji(arenaEvent.victim.outcome) +
        (arenaEvent.victim.killer ? ' Killer' : '');
  }

  return message + ')';
}

/**
 * Get the emoji for a specific outcome of an event.
 *
 * @param {string} outcome The outcome to get the emoji of.
 * @return {string} The emoji.
 */
function getOutcomeEmoji(outcome) {
  switch (outcome) {
    case 'dies':
      return emoji.skull;
    case 'nothing':
      return emoji.white_check_mark;
    case 'wounded':
      return emoji.yellow_heart;
    case 'thrives':
      return emoji.heart;
    default:
      return emoji.question;
  }
}

/**
 * Send help message to DM and reply to server.
 *
 * @param {Discord.Message} msg The message that lead to this being called.
 * @param {string} id The id of the guild this was triggered from.
 */
function help(msg, id) {
  msg.author.send(helpMessage)
      .then(() => {
        if (msg.guild != null) reply(msg, helpmessagereply, ':wink:');
      })
      .catch(() => {
 reply(msg, blockedmessage);
});
}

/**
 * Get a random word that means "nothing".
 *
 * @return {string} A word meaning "nothing".
 */
function nothing() {
  const nothings = [
    'nix', 'naught', 'nothing', 'zilch', 'void', 'zero', 'zip', 'zippo',
    'diddly', emoji.x,
  ];
  return nothings[Math.floor(Math.random() * nothings.length)];
}

/**
 * Get a random message of a given type from hgMessages.json.
 *
 * @param {string} type The message type to get.
 * @return {string} A random message of the given type.
 */
function getMessage(type) {
  const list = messages[type];
  if (!list) return 'badtype';
  const length = list.length;
  if (length == 0) return 'nomessage';
  return list[Math.floor(Math.random() * length)];
}

// Util //
/**
 * Save all game data to file.
 *
 * @param {string} [opt='sync'] Can be 'async', otherwise defaults to
 * synchronous.
 */
exports.save = function(opt) {
  if (!initialized) return;
  if (opt == 'async') {
    common.log('Saving async', 'HG');
    fs.writeFile(saveFile, JSON.stringify(games), function() {});
  } else {
    common.log('Saving sync', 'HG');
    fs.writeFileSync(saveFile, JSON.stringify(games));
  }
};

/**
 * Catch process exiting so we can save if necessary, and remove other handlers
 * to allow for another module to take our place.
 *
 * @param {number} [code] The exit code.
 */
function exit(code) {
  if (common && common.log) common.log('Caught exit!' + code, 'HG');
  else console.log('Caught exit!', code);
  if (initialized /* && code == -1 */) {
    exports.save();
  }
  try {
    exports.end();
  } catch (err) {
    common.error('Exception during end!', 'HG');
    console.log(err);
  }
}
/**
 * Same as exit(), but triggered via SIGINT, SIGHUP or SIGTERM.
 */
function sigint() {
  if (common && common.log) common.log('Caught SIGINT!', 'HG');
  else console.log('Caught SIGINT!');
  if (initialized) {
    try {
      exports.save();
    } catch (err) {
      common.error('FAILED TO SAVE ON SIGINT' + err, 'HG');
    }
  }
  try {
    exports.end();
  } catch (err) { }
  process.removeListener('exit', exit);
  process.exit();
}

// Catch reasons for exiting in order to save first.
process.on('exit', exit);
process.on('SIGINT', sigint);
process.on('SIGHUP', sigint);
process.on('SIGTERM', sigint);

/**
 * Handler for an unhandledRejection.
 *
 * @param {Object} reason Reason for rejection.
 * @param {Promise} p The promise that caused the rejection.
 */
function unhandledRejection(reason, p) {
  // console.log('Unhandled Rejection at:\n', p /*, '\nreason:', reason*/);
  console.log('Unhandled Rejection:\n', reason);
}
process.on('unhandledRejection', unhandledRejection);
