const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Store Chrome in project directory so it persists on Railway
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};