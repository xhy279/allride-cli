'use strict';

function init(projectName, cmdObj) {
	console.log(projectName, cmdObj, process.env.CLI_TARGET_PATH);
}

module.exports = init;
