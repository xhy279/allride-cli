'use strict';

const semver = require('semver');
const LOWEST_NODE_VERSION = '6.0.0';
const log = require('@allride-cli/log');

class Command {
	constructor(argv) {
		if (!argv) {
			throw new Error('参数不能为空！');
		}
		if (!Array.isArray(argv)) {
			throw new Error('参数必须为数组！');
		}
		if (argv.length < 1) {
			throw new Error('参数列表不能为空！');
		}
		this._argv = argv;
		let runner = new Promise((resolve, reject) => {
			let chain = Promise.resolve();
			chain = chain.then(() => this.checkNodeVersion());
			chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
			chain.catch((e) => log.error(e.message));
		});
	}

	checkNodeVersion() {
		const currentVersion = process.version;
		const lowestVersion = LOWEST_NODE_VERSION;
		if (!semver.gte(currentVersion, lowestVersion)) {
			throw new Error(
				`allride-cli 需要安装v${lowestVersion}及以上版本(当前Node版本为: ${currentVersion})`.red
			);
		}
	}

	initArgs() {
		this._cmd = this._argv[this._argv.length - 1];
		this._argv = this._argv.slice(0, this._argv.length - 1);
	}

	init() {
		throw new Error('init必须实现');
	}

	exec() {
		throw new Error('exec必须实现');
	}
}

module.exports = Command;
 