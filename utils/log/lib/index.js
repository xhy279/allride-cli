'use strict';

const npmlog = require('npmlog');

let log = (exports = module.exports = npmlog);

// configs
log.heading = 'Allride';
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';

// add customized log level
log.addLevel('success', 2000, { fg: 'green', bold: true });
