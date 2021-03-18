#! /usr/bin/env node

const importLocal = require('import-local');

if (importLocal(__filename)) {
  require('npmlog').info('allride-cli', "正在使用 allride-cli 本地版本");
} else {
  require('../lib')(process.argv.slice(2));
}