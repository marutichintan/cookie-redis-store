# Cookie Redis Store

Supports Redis >= 2.6.12 and (Node.js >= 6).

# Description
Another redis store for tough-cookie module.

## Install
```shell
$ npm install cookie-redis-store
```

## Basic Usage
``` javascript
const rp = require('request-promise');

const CookieRedisStore = require('cookie-redis-store');

const jar = rp.jar(new CookieRedisStore());

const qs = {
  key: 'value',
  anotherkey: 'something',
  someelse: 'content',
};

const response = await rp('https://httpbin.org/cookies/set', { qs, jar, json: true });

console.log(response);
```
## Options

  * `path` **optional** You can specify which Redis address to connect. [*default:* 'localhost:6379 db 0']
  * `id` **optional** ID for each redis store so that we can use multiple stores with the same redis database [*default:* 'default']

``` javascript
const rp = require('request-promise');

const CookieRedisStore = require('cookie-redis-store');

// Connect to 127.0.0.1:6380, db 4, using password "authpassword" and stores on key "my-cookie"
const jar = rp.jar(new CookieRedisStore('redis://:authpassword@127.0.0.1:6380/4', 'my-cookie'));

const qs = {
  key: 'value',
  anotherkey: 'something',
  someelse: 'content',
};

const response = await rp('https://httpbin.org/cookies/set', { qs, jar, json: true });

console.log(response);
```
