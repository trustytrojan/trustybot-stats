const Discord = require('discord.js');
const { String } = Discord.ApplicationCommandOptionType

const string_choice = (x) => ({ name: x, value: x });

/**
 * @param {Array} choices array of strings
 */
function string_choices(...choices) {
  const choice_objs = [];
  for(const choice of choices)
    choice_objs.push(string_choice(choice));
  return choice_objs;
}

const statistic_choices = string_choices('member', 'human', 'bot', 'channel', 'role', 'emoji', 'invite', 'ban');
const channel_type_choices = string_choices('voice', 'category');

module.exports = {
  global: [
    { name: 'ping', description: 'check ping' },
  ],

  guild: [
    { name: 'create_stat_channel', description: 'create one or more locked voice channels to display server stats', options: [
      { name: 'channel_type', type: String, description: 'choose the type of channel to create', choices: channel_type_choices, required: true },
      { name: 'statistic', type: String, description: 'choose a statistic to display', choices: statistic_choices, required: true },
      { name: 'channel_name', type: String, description: 'enter a custom channel name: the string "{stat}" will be replaced with the numerical statistic' }
    ] }
  ]
}
