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
const init = require('@allride-cli/init');
const exec = require('@allride-cli/exec');

const pkg = require('../package.json');
const consts = require('./const');

const program = new commander.Command();

async function core(arg) {
	try {
		await prepare();
		registerCommand();
	} catch (e) {
		log.error(e.message);
		if (process.env.LOG_LEVEL === 'verbose') {
			console.log(e);
		}
	}
}

async function prepare() {
	checkPkgVersion();
	checkRoot();
	checkUserHome();
	checkEnv();
	await checkGlobalUpdate();
}

function checkPkgVersion() {
	log.notice('allride-cli 脚手架版本:'.brightCyan, pkg.version);
}



function checkRoot() {
	require('root-check')();
}

function checkUserHome() {
	if (!userHome || !pathExists(userHome)) {
		throw new Error('当前登录用户主目录不存在'.red);
	}
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
		.option('-d, --debug', '是否开启调试模式', true)
		.option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '');

	program
		.command('init [projectName]')
		.option('-f, --force', '是否强制初始化项目')
		.action(exec);

	// 开启debug模式
	program.on('option:debug', function () {
		if (program.opts().debug) {
			process.env.LOG_LEVEL = 'verbose';
		} else {
			process.env.LOG_LEVEL = 'info';
		}
		log.level = process.env.LOG_LEVEL;
	});

	// 指定targetPath
	program.on('option:targetPath', function () {
		process.env.CLI_TARGET_PATH = program.opts().targetPath;
	});

	// 对未知命令监听
	program.on('command:*', function (obj) {
		const availableCommands = program.commands.map((cmd) => cmd.name());
		log.error(`未知命令: ${obj[0]}`.red);
		if (availableCommands.length > 0) {
			log.notice(`可用命令: ${availableCommands.join(',')}`.red);
		}
	});

	program.parse(process.argv);

	if (program.args && program.args.length < 1) {
		program.outputHelp();
		log.info();
	}
}
