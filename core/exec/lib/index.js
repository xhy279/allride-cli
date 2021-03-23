'use strict';

const Package = require('@allride-cli/package');
const log = require('@allride-cli/log');
const path = require('path');
const { pbkdf2 } = require('crypto');


const SETTINGS = {
	init: '@allride-cli/init',
};

const CACHE_DIR = 'dependencies/';

async function exec() {
	let targetPath = process.env.CLI_TARGET_PATH;
	const homePath = process.env.CLI_HOME_PATH;
	let storeDir = '';
	let pkg;

	log.verbose('targetPath'.blue, targetPath);
	log.verbose('homePath', homePath);

	const cmdObj = arguments[arguments.length - 1];
	const cmdName = cmdObj.name();
	const packageName = SETTINGS[cmdName];
	const packageVersion = 'latest';

	if (!targetPath) {
		targetPath = path.resolve(homePath, CACHE_DIR);
		storeDir = path.resolve(targetPath, 'node_modules');
		log.verbose('targetPath', targetPath);
		log.verbose('storeDir', storeDir);
		pkg = new Package({
			targetPath,
			packageName,
			packageVersion,
			storeDir,
		});
		if (await pkg.exists()) {
			//更新pkg
      await pkg.update();
		} else {
			// 安装pkg
			await pkg.install();
		}
	} else {
		pkg = new Package({
			targetPath,
			packageName,
			packageVersion,
			storeDir,
		});
	}
	const rootFile = pkg.getRootFilePath();
	if (rootFile) {
		require(rootFile).apply(null, arguments); // 因为arguments是数组
	}
}

module.exports = exec;
