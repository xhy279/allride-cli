const request = require('@allride-cli/request');

module.exports = function() {
  return request({
    url: '/templateAPI.json',
  });
}
