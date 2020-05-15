const blapi = require('blapi');
const apiKeys = require('../../../config/botlists.json');

module.exports = async (client) => {
    blapi.handle(client, apiKeys, 60);
};