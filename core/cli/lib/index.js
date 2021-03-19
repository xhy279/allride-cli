'use strict';

module.exports = core;

const dedent = require('dedent');
const colors = require('colors');
const semver = require('semver');
const log = require('@allride-cli/log');
const userHome = require('user-home');
const pathExists = require('path-exists');
const path = require('path');
const commander = require('commander');

const pkg = require('../package.json');
const consts = require('./const');
const { Command } = require('commander');

let args;
const program = new commander.Command();

async function core(arg) {
	try {
		checkPkgVersion();
		checkNodeVersion();
		checkRoot();
		checkUserHome();
		// checkInputArgs();
		checkEnv();
		await checkGlobalUpdate();
		registerCommand();
	} catch (e) {
		log.error(e.message);
	}
}

function checkPkgVersion() {
	log.notice('allride-cli 脚手架版本:'.brightCyan, pkg.version);
}

function checkNodeVersion() {
	const currentVersion = process.version;
	const lowestVersion = consts.LOWEST_NODE_VERSION;
	if (!semver.gte(currentVersion, lowestVersion)) {
		throw new Error(
			`allride-cli 需要安装v${lowestVersion}及以上版本(当前Node版本为: ${currentVersion})`.red
		);
	}
}

function checkRoot() {
	require('root-check')();
}

function checkUserHome() {
	if (!userHome || !pathExists(userHome)) {
		throw new Error('当前登录用户主目录不存在'.red);
	}
}

function checkInputArgs() {
	const minimist = require('minimist');
	args = minimist(process.argv.slice(2));
	checkArgs();
}

function checkArgs() {
	if (args.debug) {
		process.env.LOG_LEVEL = 'debug';
	} else {
		process.env.LOG_LEVEL = 'info';
	}
	log.level = process.env.LOG_LEVEL;
}

function checkEnv() {
	const dotenv = require('dotenv');
	const dotenvPath = path.resolve(userHome, '.env');
	// read your .env file, parse the contents, assign it to process.env
	// => { parsed: { CLI_HOME: '.allride-cli' } }
	if (pathExists(dotenvPath)) {
		dotenv.config({
			path: dotenvPath,
		});
	}
	//
	createDefaultConfig();
	log.verbose('环境变量:', process.env.CLI_HOME_PATH);
}

function createDefaultConfig() {
	const cliConfig = {
		home: userHome,
	};
	if (process.env.CLI_HOME) {
		cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
	} else {
		cliConfig['cliHome'] = path.join(userHome, consts.DEFAULT_CLI_HOME);
	}
	process.env.CLI_HOME_PATH = cliConfig.cliHome;
	return cliConfig;
}

async function checkGlobalUpdate() {
	// 获取当前版本号和模块名
	const currentVersion = pkg.version;
	const npmName = pkg.name;
	// 调用npm api获得线上所有版本号, 提取所有版本号，对比哪些是大于当前版本号
	const { getNpmSemversion } = require('@allride-cli/get-npm-info');
	const latestVersion = await getNpmSemversion(npmName, currentVersion);
	if (latestVersion && semver.gt(latestVersion, currentVersion)) {
		log.warn(
			'更新提示',
			dedent`请手动更新${npmName}, 当前版本${currentVersion}, 最新版本${latestVersion}
更新命令: npm i -g ${npmName}`.yellow
		);
	}
	// 获取最新版本号，提示用户更新到该版本
}

function registerCommand() {
	program
		.name(Object.keys(pkg.bin)[0])
		.usage('<command> [options]')
		.version(pkg.version)
		.option('-d, --debug', '是否开启调试模式', false);

	program	
		.command('init [projectName]')
		.option('-f, --force', '是否强制初始化项目')
		.action(init)

	// 开启debug模式
	program.on('option:debug', function () {
		if (program.debug) {
			process.env.LOG_LEVEL = 'verbose';
		} else {
			process.env.LOG_LEVEL = 'info';
		}
		log.level = process.env.LOG_LEVEL;
	});

	// 对未知命令监听
	program.on('command:*', function(obj) {
		const availableCommands = program.commands.map(cmd => cmd.name());
		console.log(`未知命令: ${obj[0]}`.red);
		if (availableCommands.length > 0) {
			console.log(`可用命令: ${availableCommands.join(',')}`.red);
		}
	})

	
	program.parse(process.argv);

	if (program.args && program.args.length < 1) {	
		program.outputHelp();
		console.log();
	}
}
