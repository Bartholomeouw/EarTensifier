const Command = require('../../structures/Command');

const play = require('../../utils/music/play.js');
const spawnPlayer = require('../../player/spawnPlayer.js');
const patreon = require('../../../config/patreon.js');
const premium = require('../../utils/premium.js');
const { getData, getPreview } = require('spotify-url-info');

module.exports = class Play extends Command {
	constructor(client) {
		super(client, {
			name: 'play',
			description: 'Plays a song',
			usage: '<search query>',
			aliases: ['p'],
			cooldown: '5',
			args: true,
			inVoiceChannel: true,
		});
	}
	async run(client, message, args) {
		if (!args[0]) return message.channel.send('Please provide a search query.');

		const permissions = message.member.voice.channel.permissionsFor(client.user);
		if (!permissions.has('CONNECT')) return client.responses('noPermissionConnect', message);
		if (!permissions.has('SPEAK')) return client.responses('noPermissionSpeak', message);

		let player = client.music.players.get(message.guild.id);
		if (player && player.playing === false && player.current) return message.channel.send(`Cannot play/queue songs while paused. Do \`${client.settings.prefix} resume\` to play.`);
		if (!player) player = await spawnPlayer(client, message);

		const msg = await message.channel.send(`${client.emojiList.cd}  Searching for \`${args.join(' ')}\`...`);

		if (await songLimit() == patreon.defaultMaxSongs && player.queue.length >= patreon.defaultMaxSongs) return msg.edit(`You have reached the **maximum** amount of songs (${patreon.defaultMaxSongs} songs). Want more songs? Consider donating here: https://www.patreon.com/eartensifier`);
		if (await songLimit() == patreon.premiumMaxSongs && player.queue.length >= patreon.premiumMaxSongs) return msg.edit(`You have reached the **maximum** amount of songs (${patreon.premiumMaxSongs} songs). Want more songs? Consider donating here: https://www.patreon.com/eartensifier`);
		if (await songLimit() == patreon.proMaxSongs && player.queue.length >= patreon.proMaxSongs) return msg.edit(`You have reached the **maximum** amount of songs (${patreon.proMaxSongs} songs). Want more songs? Contact the developer: \`Tetra#0001\``);

		let searchQuery;
		if (args[0].startsWith(client.settings.spotifyURL)) {
			const data = await getData(args.join(' '));
			if (data.type == 'playlist' || data.type == 'album') {
				const sL = await songLimit();
				let songsToAdd = 0;
				if (player.queue.length == 0) { songsToAdd = Math.min(sL, data.tracks.items.length); }
				else {
					const totalSongs = player.queue.length + data.tracks.items.length;
					if (totalSongs > sL) songsToAdd = Math.min(sL - player.queue.length, data.tracks.items.length);
					else songsToAdd = data.tracks.items.length;
				}
				if (data.type == 'playlist') {
					for (let i = 0; i < songsToAdd; i++) {
						const song = data.tracks.items[i];
						play(client, message, msg, player, `${song.track.name} ${song.track.artists[0].name}`, true);
					}
				}
				else {
					await data.tracks.items.forEach(song => {
						play(client, message, msg, player, `${song.name} ${song.artists[0].name}`, true);
					});
				}
				const playlistInfo = await getPreview(args.join(' '));
				if (data.tracks.items.length != songsToAdd) {
					if (await songLimit() == patreon.defaultMaxSongs) msg.edit(`**${playlistInfo.title}** (${songsToAdd} tracks) has been added to the queue by **${message.author.tag}**\nYou have reached the **maximum** amount of songs (${patreon.defaultMaxSongs} songs). Want more songs? Consider donating here: https://www.patreon.com/eartensifier`);
					else if (await songLimit() == patreon.premiumMaxSongs) msg.edit(`**${playlistInfo.title}** (${songsToAdd} tracks) has been added to the queue by **${message.author.tag}**\nYou have reached the **maximum** amount of songs (${patreon.premiumMaxSongs} songs). Want more songs? Consider donating here: https://www.patreon.com/eartensifier`);
					else if (await songLimit() == patreon.proMaxSongs) msg.edit(`**${playlistInfo.title}** (${songsToAdd} tracks) has been added to the queue by **${message.author.tag}**\nYou have reached the **maximum** amount of songs (${patreon.proMaxSongs} songs). Want more songs? Contact \`Tetra#0001\``);
				}
				else { msg.edit(`**${playlistInfo.title}** (${songsToAdd} tracks) has been added to the queue by **${message.author.tag}**`); }
			}
			else if (data.type == 'track') {
				const track = await getPreview(args.join(' '));
				play(client, message, msg, player, `${track.title} ${track.artist}`, false);
			}
		}
		else {
			searchQuery = args.join(' ');
			if (['youtube', 'soundcloud', 'bandcamp', 'mixer', 'twitch'].includes(args[0].toLowerCase())) {
				searchQuery = {
					source: args[0],
					query: args.slice(1).join(' '),
				};
			}
			play(client, message, msg, player, searchQuery, false);
		}

		async function songLimit() {
			const hasPremium = await premium(message.author.id, 'Premium');
			const hasPro = await premium(message.author.id, 'Pro');
			if (!hasPremium && !hasPro) return patreon.defaultMaxSongs;
			if (hasPremium && !hasPro) return patreon.premiumMaxSongs;
			if (hasPremium && hasPro) return patreon.proMaxSongs;
		}
	}
};