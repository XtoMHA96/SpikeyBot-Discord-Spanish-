// Copyright 2020 Campbell Crowley. All rights reserved.
// Author: Campbell Crowley (web@campbellcrowley.com)

/**
 * @description Configuration for the Shard Master. This config will be updated
 * during runtime if it is edited. Relevant settings may be sent to each shard
 * during each initial setup.
 * @class
 * @memberof ShardingMaster
 * @inner
 * @static
 */
class ShardMasterConfig {
  /**
   * @description Create config object.
   */
  constructor() {
    /**
     * @description The number of shards to start if auto detection is turned
     * off.
     * @default
     * @public
     * @type {number}
     */
    this.numShards = 0;
    /**
     * @description Whether to use the shard count Discord recommends for us. If
     * true, the bot name must be specified, and the corresponding token must be
     * available in `../auth.js`.
     * @default
     * @public
     * @type {boolean}
     */
    this.autoDetectNumShards = true;
    /**
     * @description The interval to check for how many shards we should have at
     * one time, in milliseconds.
     * @public
     * @default
     * @type {number}
     */
    this.autoDetectInterval = 24 * 60 * 60 * 1000;
    /**
     * @description The name of the bot that corresponds to the token to use in
     * `../auth.js`.
     * @default
     * @public
     * @type {string}
     */
    this.botName = 'release';
    /**
     * @description The largest acceptable difference in timestamp values
     * received from shards in milliseconds.
     * @public
     * @default
     * @type {number}
     * @default 5 Minutes
     */
    this.tsPrecision = 1000 * 60 * 5;

    /**
     * @description The maximum number of connection attempts within
     * {@link connTime} before the IP address is blocked.
     * @public
     * @default
     * @type {number}
     */
    this.connCount = 10;
    /**
     * @description The duration in milliseconds to store connection attempt
     * history.
     * @public
     * @default
     * @type {number}
     */
    this.connTime = 60000;

    /**
     * @description Host information for remote shards to use in order to be
     * able to find us.
     * @public
     * @type {object}
     * @default
     */
    this.remoteHost = {
      host: 'kamino.spikeybot.com',
      port: 443,
      protocol: 'https:',
      path: '/socket.io/',
    };

    /**
     * @description Configuration specifying how detecting if shards are still
     * online shall work.
     * @default
     * @public
     * @type {ShardMasterConfig~HeartbeatConfig}
     */
    this.heartbeat = new HeartbeatConfig();

    /**
     * @description Configuration specifying how to alert admins about important
     * system updates.
     * @default
     * @public
     * @type {ShardMasterConfig~MailConfig}
     */
    this.mail = new MailConfig();
  }
}

/**
 * @description Configuration for the Shard Master. This config will be updated
 * during runtime if it is edited. Relevant settings may be sent to each shard
 * during each initial setup. These settings are related to heartbeat and uptime
 * management. This is included in {@link ShardMasterConfig}. This interval is
 * also used to update shard configuration if necessary.
 * @class
 * @memberof ShardingMaster.ShardMasterConfig
 * @inner
 * @static
 */
class HeartbeatConfig {
  /**
   * @description Create config object.
   */
  constructor() {
    /**
     * @description The method used to update shard status.
     *
     * "pull" specifies that the master will attempt to pull the information
     * from the shards at the configured interval.
     *
     * "push" specifies that the shards are expected to push their status to
     * the master at the specified interval.
     *
     * "event" would only send updates from either side if one believes a
     * state to have changed.
     *
     * @public
     * @type {string}
     * @default
     */
    this.updateStyle = 'pull';
    /**
     * @description If relevant, this is the expected interval at which to
     * send/receive updates about an individual shard's status in milliseconds.
     * @public
     * @type {number}
     * @default
     */
    this.interval = 30000;
    /**
     * @description If relevant, should we attempt to disperse the heartbeat
     * requests throughout the interval such that not all requests are made at
     * the same time. This could cause statistics to not line up or be
     * inconsistent.
     * @public
     * @type {boolean}
     * @default
     */
    this.disperse = true;
    /**
     * @description If statistics about messages received from Discord should be
     * used in the evaluation of a shard's alive state. This means, that if no
     * messages are received from Discord between heartbeats, we can assume the
     * shard is dead. This may not be feasible on smaller bots.
     * @public
     * @type {boolean}
     * @default
     */
    this.useMessageStats = true;
    /**
     * @description The timeout after not receiving a heartbeat from a shard to
     * request that it reboots, in milliseconds.
     * @public
     * @type {number}
     * @default
     */
    this.requestRebootAfter = 120000;
    /**
     * @description The timeout after the shard does not receive an update from
     * the master to reboot. This is the threshold that once crossed, the master
     * assumes the shard is rebooting or has otherwise lost connection, and
     * stops sending reboot requests. The shard is not considered completely
     * dead yet, and will not be replaced until after the {@link
     * assumeDeadAfter} timeout.
     * @public
     * @type {number}
     * @default
     */
    this.expectRebootAfter = 180000;
    /**
     * @description The timeout after the master does not receive an update from
     * the shard to assume the shard has died, and we can begin recovery
     * procedueres (milliseconds).
     * @public
     * @type {number}
     * @default
     */
    this.assumeDeadAfter = 300000;
  }
}

/**
 * @description Configuration for the Shard Master. This config will be updated
 * during runtime if it is edited. Relevant settings may be sent to each shard
 * during each initial setup. These settings are related to informing sysadmins
 * of important updates.
 * @class
 * @memberof ShardingMaster.ShardMasterConfig
 * @inner
 * @static
 */
class MailConfig {
  /**
   * @description Create config object.
   */
  constructor() {
    /**
     * @description Is the mail system enabled. It must also be configured
     * properly on the system in order for it to work.
     * @public
     * @default
     * @type {boolean}
     */
    this.enabled = true;
    /**
     * @description The command that will be used to send the email.
     * @public
     * @default
     * @type {string}
     */
    this.command = 'mail';
    /**
     * @description Additional arguments to pass to the mail command.
     * @public
     * @default
     * @type {string[]}
     */
    this.args = ['sysadmin@spikeybot.com', '-s Automated Sharding Update'];
    /**
     * @description Options to pass to the spawn function when calling the
     * command.
     * @see {@link
     * https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options}
     * @public
     * @type {object}
     * @default
     */
    this.spawnOpts = {env: null, timeout: 120000};
    /**
     * @description The message to send in the email when a shard config file
     * was created successfully and has been attached to the emai.
     * @public
     * @type {string}
     * @default
     */
    this.shardConfigCreateMessage =
        'Hello!\n\nA config file for a new shard was generated at {date}.' +
        '\n\nID: {id}\nPubKey: {pubkey}\n\nYours Truly,\nSpikeyBot Sharding ' +
        'Master.';
    /**
     * @description The message to send in the email when a shard config file
     * was created successfully and has been attached to the emai.
     * @public
     * @type {string}
     * @default
     */
    this.shardConfigCreateFailMessage =
        'Hello!\n\nA config file for a new shard failed to be generated at ' +
        '{date}.\n\n{errors}\n\nYours Truly,\nSpikeyBot Sharding Master.';
  }
}

ShardMasterConfig.HeartbeatConfig = HeartbeatConfig;
ShardMasterConfig.MailConfig = MailConfig;

module.exports = ShardMasterConfig;