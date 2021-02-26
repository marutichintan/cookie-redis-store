const chai = require('chai');
const Redis = require('ioredis');
const rp = require('request-promise');

const redis = new Redis();
let newredis = new Redis(null);

const CookieRedisStore = require('../');

const { expect } = chai;

describe('CookieRedisStore', async () => {
  let jar;
  it('without cookie', async () => {
    // await redis.del('test');
    jar = rp.jar(new CookieRedisStore(redis, 'test'));
    const response = await rp('https://httpbin.org/cookies', { jar, json: true });
    expect({}).to.deep.equal(response.cookies);
  }).timeout(10000);
  it('set cookie', async () => {
    const qs = {
      key: 'value',
      anotherkey: 'something',
      someelse: 'content',
    };
    const response = await rp('https://httpbin.org/cookies/set', { qs, jar, json: true });
    expect(qs).to.deep.equal(response.cookies);
  }).timeout(10000);
  it('replace cookie', async () => {
    const qs = {
      key: 'replaced',
    };
    const expected = {
      key: 'replaced',
      anotherkey: 'something',
      someelse: 'content',
    };
    const response = await rp('https://httpbin.org/cookies/set', { qs, jar, json: true });
    expect(expected).to.deep.equal(response.cookies);
  }).timeout(10000);
  it('delete cookie', async () => {
    const qs = {
      anotherkey: 'something',
    };
    const expected = {
      key: 'replaced',
      someelse: 'content',
    };
    const response = await rp('https://httpbin.org/cookies/delete', { qs, jar, json: true });
    await redis.del('test');
    expect(expected).to.deep.equal(response.cookies);
  }).timeout(10000);
});
