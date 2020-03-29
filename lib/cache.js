module.exports = function (mongoose, redisClient) {
    const promisifiedRedisFunctions = require('./helper/promisify')(redisClient);
    const mongooseUtil = require('./helper/mongooseUtil')(mongoose);
    const redisUtil = require('./helper/redisUtil')(promisifiedRedisFunctions);

    const queryExec = mongoose.Query.prototype.exec;
    const aggregateExec = mongoose.Aggregate.prototype.exec;

    mongoose.Query.prototype.cache = function (cache = {}) {
        this._cache = cache && typeof cache === 'object' ? cache : {};
        return this;
    };

    mongoose.Aggregate.prototype.cache = function (cache = {}) {
        this._cache = cache && typeof cache === 'object' ? cache : {};
        return this;
    };

    mongoose.Query.prototype.exec = async function () {
        if (!this._cache)
            return queryExec.apply(this, arguments);

        const key = mongooseUtil.buildCacheKeyFromQuery.call(this);
        const cacheValue = await promisifiedRedisFunctions.get(key);
        if (cacheValue) {
            const docs = JSON.parse(cacheValue);

            if (!docs || typeof docs !== 'object') return docs;
            if (this.mongooseOptions().lean) return docs;

            return Array.isArray(docs)
                ? docs.map(d => mongooseUtil.hydratePopulated.call(this, d))
                : mongooseUtil.hydratePopulated.call(this, docs);
        }

        const result = await queryExec.apply(this, arguments);
        await redisUtil.save.call(this, key, JSON.stringify(result));
        return result;
    };

    mongoose.Aggregate.prototype.exec = async function () {
        if (!this._cache)
            return aggregateExec.apply(this, arguments);

        const key = mongooseUtil.buildCacheKeyFromAggregate.call(this);
        const cacheValue = await promisifiedRedisFunctions.get(key);
        if (cacheValue)
            return JSON.parse(cacheValue);

        const result = await aggregateExec.apply(this, arguments);
        await redisUtil.save.call(this, key, JSON.stringify(result));
        return result;
    };

    mongoose.clearCache = async function (query) {
        if (!query) query = this;

        let key = query instanceof mongoose.Query
            ? mongooseUtil.buildCacheKeyFromQuery.call(query)
            : query instanceof mongoose.Aggregate
                ? mongooseUtil.buildCacheKeyFromAggregate.call(query)
                : null;

        if (!key) return;
        return await promisifiedRedisFunctions.del(key);
    };

    mongoose.Query.prototype.clearCache = mongoose.clearCache;
    mongoose.Aggregate.prototype.clearCache = mongoose.clearCache;

};