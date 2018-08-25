const debug = require('debug');
const Redis = require('ioredis');
const tough = require('tough-cookie');

const { permuteDomain, pathMatch } = tough;

function matchAll(domainIndex) {
  const results = [];
  Object.keys(domainIndex).forEach((curPath) => {
    const pathIndex = domainIndex[curPath];
    Object.keys(pathIndex).forEach((key) => {
      results.push(pathIndex[key]);
    });
  });
  return results;
}

function matchRFC(domainIndex, path) {
  const results = [];
  // NOTE: we should use path-match algorithm from S5.1.4 here
  // (see : https://github.com/ChromiumWebApps/chromium/blob/b3d3b4da8bb94c1b2e061600df106d590fda3620/net/cookies/canonical_cookie.cc#L299)
  Object.keys(domainIndex).forEach((cookiePath) => {
    if (pathMatch(path, cookiePath)) {
      const pathIndex = domainIndex[cookiePath];
      Object.keys(pathIndex).forEach((key) => {
        results.push(pathIndex[key]);
      });
    }
  });
  return results;
}


class RedisCookie {
  constructor(path, id) {
    this.redis = new Redis(path);

    const loaded = this.load();
    this.id = id || '';
    this.idx = loaded ? JSON.parse(loaded) : {};
    this.synchronous = true;
  }

  load() {
    // carrega do redis
    this.redis.get(this.id);
  }

  save() {
    // salva no redis
    this.redis.set(this.id, JSON.stringify(this.idx));
  }

  findCookie(domain, path, key, next) {
    if (!this.idx[domain] ||
      !this.idx[domain][path] ||
      !this.idx[domain][path][key]) {
      debug('redis-cookie:findCookie')('no-cookie to', domain, path, key);
      return next(null, undefined);
    }
    const cookie = this.idx[domain][path][key];
    debug('redis-cookie:findCookie')('cookie', cookie, 'to', domain, path, key);
    return next(null, cookie);
  }

  findCookies(domain, path, next) {
    debug('redis-cookie:findCookies')('domain', domain);
    debug('redis-cookie:findCookies')('path', path);

    let results = [];

    if (!domain) {
      debug('redis-cookie:findCookies')('no-cookie to', domain);
      return next(null, []);
    }

    let pathMatcher;

    if (!path) {
      // null means "all paths"
      debug('redis-cookie:findCookies')('null path to', domain, path);
      pathMatcher = matchAll;
    } else {
      debug('redis-cookie:findCookies')('not null path to', domain, path);
      pathMatcher = matchRFC;
    }

    const domains = permuteDomain(domain) || [domain];
    debug('redis-cookie:findCookies')('domains', domains);
    const { idx } = this;
    domains.forEach((curDomain) => {
      const domainIndex = idx[curDomain];
      if (!domainIndex) {
        debug('redis-cookie:findCookies')('no domain index', domain);
        return;
      }
      debug('redis-cookie:findCookies')('domain index', domainIndex, 'on', domain, path);
      results = [...pathMatcher(domainIndex, path)];
    });

    debug('redis-cookie:findCookies')('results', results);
    return next(null, results);
  }

  putCookie(cookie, next) {
    if (!this.idx[cookie.domain]) {
      this.idx[cookie.domain] = {};
    }
    if (!this.idx[cookie.domain][cookie.path]) {
      this.idx[cookie.domain][cookie.path] = {};
    }
    debug('redis-cookie:putCookie')('cookie', cookie);
    this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
    this.save();
    next(null);
  }

  updateCookie(oldCookie, newCookie, next) {
    // updateCookie() may avoid updating cookies that are identical.  For example,
    // lastAccessed may not be important to some stores and an equality
    // comparison could exclude that field.
    debug('redis-cookie:updateCookie')('oldCookie', oldCookie);
    debug('redis-cookie:updateCookie')('newCookie', newCookie);
    this.putCookie(newCookie, next);
  }

  removeCookie(domain, path, key, next) {
    debug('redis-cookie:removeCookie')('remove cookie on', domain, path, key);
    if (this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key]) {
      delete this.idx[domain][path][key];
    }
    this.save();
    next(null);
  }

  removeCookies(domain, path, next) {
    debug('redis-cookie:removeCookies')('remove cookies on', domain, path);
    if (this.idx[domain]) {
      if (path) {
        delete this.idx[domain][path];
      } else {
        delete this.idx[domain];
      }
    }
    this.save();
    return next(null);
  }

  getAllCookies(next) {
    debug('redis-cookie:getAllCookies')('get all cookies');
    const cookies = [];
    const { idx } = this;

    const domains = Object.keys(idx);
    domains.forEach((domain) => {
      const paths = Object.keys(idx[domain]);
      paths.forEach((path) => {
        const keys = Object.keys(idx[domain][path]);
        keys.forEach((key) => {
          if (key !== null) {
            cookies.push(idx[domain][path][key]);
          }
        });
      });
    });

    // Sort by creationIndex so deserializing retains the creation order.
    // When implementing your own store, this SHOULD retain the order too
    cookies.sort((a, b) => (a.creationIndex || 0) - (b.creationIndex || 0));

    next(null, cookies);
  }
}
exports.MemoryCookieStore = RedisCookie;

