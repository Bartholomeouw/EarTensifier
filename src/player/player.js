const { Manager } = require('@tetracyl/erela.js');
const trackStart = require('./trackStart.js');
const queueEnd = require('./queueEnd.js');

module.exports = async (client) => {
	client.music = new Manager({
		nodes: [{
			host: process.env.LAVALINK_HOST,
			port: process.env.LAVALINK_PORT,
			password: process.env.LAVALINK_PASSWORD,
		}],
		autoPlay: true,
		send(id, payload) {
			const guild = client.guilds.cache.get(id);
			if (guild) guild.shard.send(payload);
		},
	})
	.on('nodeError', (node, error) => client.log(`Node error: ${error.message}`))
	.on('queueEnd', player => {
		queueEnd(client, player);
	})
	.on('trackStart', ({ textChannel }, { title, length, author, uri }) => {
		trackStart(client, textChannel, title, length, author, uri);
	})
	.on('playerMove', (player, currentChannel, newChannel) => {
		player.voiceChannel = client.channels.cache.get(newChannel);
	});
};