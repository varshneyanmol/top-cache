const util = require('util');

function promisify(redisClient, fn) {
    return util.promisify(fn).bind(redisClient);
}

module.exports = function (redisClient) {
    return Object.freeze({
        get: promisify(redisClient, redisClient.get),
        set: promisify(redisClient, redisClient.set),
        del: promisify(redisClient, redisClient.del),
        pexpireat: promisify(redisClient, redisClient.pexpireat),
    });
};
