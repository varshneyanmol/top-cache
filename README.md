Caching library for Mongoose queries using Redis.

This library monkey-patches Mongoose' Query and Aggregate exec functions to add a cache layer in between. And it also adds some methods to mongoose.

# Installation

Using NPM

```
npm install top-cache --save
```

# Getting Started

Require this library at the start of the application so that its functionality is available throughout the application.
```$xslt
const mongoose = require('mongoose');
const redisClient = require('redis').createClient('redis://127.0.0.1:6379');

const topcache = require('top-cache');
topcache(mongoose, redisClient);
```  

That's it. Now throughout application you can use:
```$xslt
.cache(options)
.clearCache()
``` 
on any Mongoose Query or Aggregate.

In .cache() function, you can pass an object specifying either one of the following:

- `ttl`: number of milliseconds the query result should be cached for in redis.
- `pexpireAt`: timestamp(in milliseconds) or Date the query result should expire at.
- `persist: true`: if query result should be persisted permanently in redis.
- If none of these options is specified, then query result is cached for 24 hours.

# Examples

```$xslt
var dummyModel = mongoose.model('dummyModel');

// this query will be cached for 2 hours
dummyModel
    .find({age: {$gte: 20}})
    .select('_id name age')
    .cache({ttl: 2 * 60 * 60 * 1000})

// this aggregate query will be cached permanently
dummyModel.aggregate([
    {$match: {age: {$gte: 20}}},
    {$project: {_id: 1, name: 1, age: 1}}
]).cache({persist: true})


// if you want to remove the query result from cache.
// method 1:
mongoose.clearCache(dummyModel.find({age: {$gte: 20}}).select('_id name age'))

//method 2:
 dummyModel
     .find({age: {$gte: 20}})
     .select('_id name age')
     .clearCache()

```