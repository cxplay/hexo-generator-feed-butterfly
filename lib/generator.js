'use strict';

const nunjucks = require('nunjucks');
const env = new nunjucks.Environment();
const { join } = require('path');
const { readFileSync } = require('fs');
const { encodeURL, gravatar, full_url_for } = require('hexo-util');

env.addFilter('uriencode', str => {
  return encodeURL(str);
});

env.addFilter('noControlChars', str => {
  return str.replace(/[\x00-\x1F\x7F]/g, ''); // eslint-disable-line no-control-regex
});

env.addFilter('styleFilter', str => {
  return str
  .replace(/<td class="gutter"><pre>(?:<span class="line">[0-9]+<\/span><br>)+<\/pre><\/td>/g, '') // Prune line numbers
  .replace(/<span class="line">(.*?)<\/span><br>/g, '$1\n') // Prune code span tag
  .replace(/<span class=".*?">(.*?)<\/span>/g, '$1') // Prune code span tag
  .replace(/<figure class="highlight .*?"><table><tr><td class="code"><pre>(.*?)<\/pre><\/td><\/tr><\/table><\/figure>/gs, '<pre><code>$1<\/code><\/pre>') // Refactoring code blocks
  .replace(/<img src= ".*?" data-lazy-src="(.*?)" alt="(.*?)">/g, '<img src="$1" alt="$2" title="$2">'); // Prune lazyload img
});

module.exports = function(locals, type, path) {
  const { config } = this;
  const { email, feed, url: urlCfg } = config;
  const { icon: iconCfg, limit, order_by, template: templateCfg, type: typeCfg } = feed;

  env.addFilter('formatUrl', str => {
    return full_url_for.call(this, str);
  });

  let tmplSrc = join(__dirname, `../${type}.xml`);
  if (templateCfg) {
    if (typeof templateCfg === 'string') tmplSrc = templateCfg;
    else tmplSrc = templateCfg[typeCfg.indexOf(type)];
  }
  const template = nunjucks.compile(readFileSync(tmplSrc, 'utf8'), env);

  let posts = locals.posts.sort(order_by || '-date');
  posts = posts.filter(post => {
    return post.draft !== true;
  });

  if (posts.length <= 0) {
    feed.autodiscovery = false;
    return;
  }

  if (limit) posts = posts.limit(limit);

  let url = urlCfg;
  if (url[url.length - 1] !== '/') url += '/';

  let icon = '';
  if (iconCfg) icon = full_url_for.call(this, iconCfg);
  else if (email) icon = gravatar(email);

  const feed_url = full_url_for.call(this, path);

  const data = template.render({
    config,
    url,
    icon,
    posts,
    feed_url
  });

  return {
    path,
    data
  };
};
