const Discord = require('discord.js');
const { writeFileSync, existsSync } = require('fs');
const { TGuild } = require('./classes');

const tguilds = new Discord.Collection();

const tg_filename = './tguilds.json';

if(existsSync(tg_filename)) {
  for(const o of require(tg_filename)) {
    tguilds.set(o.guild, new TGuild(o));
  }
}

const client = new Discord.Client({
  intents: [
    'Guilds',
    'GuildMembers'
  ]
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  //setCommands();
  updateAllStatChannels();
  setInterval(updateAllStatChannels, 60_000);
});

client.on('interactionCreate', async (interaction) => {
  function somethingWentWrong() {
    interaction.replyEphemeral(`something went wrong, please try again`).catch(console.error);
  }
  const { user, member, guild, guildId, channel, channelId } = interaction;
  const myPerms = guild.members.me.permissions;

  if(interaction.inGuild()) {
    if(!guild) { somethingWentWrong(); return; }
    tguilds.ensure(guildId, () => new TGuild({ guild: guildId }));
  }

  if(interaction.isChatInputCommand()) {
    const { commandName, options } = interaction;
    switch(commandName) {
      case 'ping': await interaction.reply(`\`${client.ws.ping}ms\``); break;
      case 'create_stat_channel': {
        // we want a GuildMember object to check permissions
        if(!(member instanceof Discord.GuildMember)) { somethingWentWrong(); break; }

        // check permissions
        if(!myPerms.has('ManageChannels')) {
          await interaction.reply('i need `Manage Channels` perms to create server stat channels');
          break;
        }
        if(!member.permissions.has('ManageChannels')) {
          await interaction.replyEphemeral('you need `Manage Channels` perms to create server stat channels');
          break;
        }

        // type of statistic (see command-data.js)
        const stat_type = options.getString('statistic');

        // prepare the value of the desired statistic
        const stat_value = get_stat_value(guild, stat_type);

        // get channel type enum value
        const type = {
          voice: Discord.ChannelType.GuildVoice,
          category: Discord.ChannelType.GuildCategory
        }[options.getString('channel_type')];

        // capitalize the stat type for use with the default channel name
        const stat_type_capitalized = stat_type.replace(stat_type[0], stat_type[0].toUpperCase());

        const channel_name = options.getString('channel_name');
        const default_name = `${stat_type_capitalized} Count: {stat}`;

        // insert the statistic's value into the channel name
        const name = (channel_name ?? default_name).replace('{stat}', stat_value.toString());

        // prevent members from joining and allow myself to edit the channel
        const permissionOverwrites = [
          { id: guild.roles.everyone, deny: 'Connect' },
          { id: guild.roles.botRoleFor(client.user), allow: 'ViewChannel' }
        ];

        // save id of the new channel
        const { id } = await guild.channels.create({ type, name, permissionOverwrites });
        tguilds.get(guildId)[stat_type] = { channel: id, name: channel_name ?? default_name };
        
        await interaction.reply('successfully created!');
      }
    }
  }
});

// make sure data gets saved before exiting
process.on('uncaughtException', (err) => { console.error(err); kill(); });
process.on('SIGINT', kill);
process.on('SIGTERM', kill);

// this should only be run in the 'ready' event listener
function setCommands() {
  const { global, guild } = require('./command-data');
  client.application.commands.set(global).catch(console.error);
  for(const { commands } of client.guilds.cache.values())
    commands.set(guild).catch(console.error);
}

/**
 * @param {Discord.Guild} guild
 * @param {string} stat_type
 * @return {number}
 */
function get_stat_value(guild, stat_type) {
  return {
    member: guild.memberCount,
    human: guild.members.cache.filter((m) => !m.user.bot).size,
    bot: guild.members.cache.filter((m) => m.user.bot).size,
    channel: guild.channels.cache.size,
    role: guild.roles.cache.size,
    emoji: guild.emojis.cache.size,
    invite: guild.invites.cache.size,
    ban: guild.bans.cache.size
  }[stat_type];
}

// updates all stat channels in all servers
async function updateAllStatChannels() {
  for(const tg of tguilds.values()) {
    if(!(tg instanceof TGuild)) continue;
    let guild;
    try { guild = await client.guilds.fetch(tg.guild); }
    catch(err) { tguilds.delete(tg.guild); continue; }
    for(const k in tg) {
      if(!tg[k].channel || k === 'guild') continue;
      const name = tg[k].name.replace('{stat}', get_stat_value(guild, k));
      let channel;
      try { channel = await guild.channels.fetch(tg[k].channel); }
      catch(err) { tg[k].channel = null; continue; }
      channel.edit({ name }).catch(console.error);
    }
  }
}

function kill() { client.destroy(); writeData(); process.exit(); }

function writeData() {
  writeFileSync(tg_filename, JSON.stringify(tguilds, null, '  '));
}

client.login(require('./token.json'));
