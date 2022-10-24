const tguild_keys = ['member', 'human', 'bot', 'channel', 'role', 'emoji', 'invite', 'ban'];

function TGuild(o) {
  this.guild = o.guild;
  if(typeof this.guild !== 'string') return;
  for(const k of tguild_keys) {
    this[k] = o[k] ?? { channel: null, name: null };
  }
}

module.exports = { TGuild };
