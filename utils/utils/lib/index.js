'use strict';

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function spinnerStart(loadingMessage, spinnerString='') {
  const Spinner = require('cli-spinner').Spinner;
  const spinner = new Spinner(`${loadingMessage}... %s`);
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

function sleep(timeout) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

module.exports = {
  isObject,
  spinnerStart,
  sleep,
};
