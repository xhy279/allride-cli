'use strict';
const Command = require('@allride-cli/command');
const Package = require('@allride-cli/package');
const log = require('@allride-cli/log');
const { spinnerStart } = require('@allride-cli/utils');

const inquirer = require('inquirer');
const fs = require('fs');
const fse = require('fs-extra');
const semver = require('semver');
const userHome = require('user-home');

const getProjectTemplate = require('./getProjectTemplate');
const { sleep } = require('../../../models/package/node_modules/@allride-cli/utils/lib');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

class InitCommand extends Command {
	init() {
		this.projectName = this._argv[0] || '';
		this.force = !!this._argv[1].force;
		log.verbose('projectName', this.projectName);
		log.verbose('force', this.force);
	}

	async exec() {
		try {
			// 1. 准备阶段
			const projectInfo = await this.prepare();
			// 2. 下载模板
			if (projectInfo) {
				log.verbose('projectInfo', projectInfo);
				this.projectInfo = projectInfo;
				await this.downloadTemplate();
			}
			// 3. 安装模板
		} catch (e) {
			console.log(e);
			log.error(e.message);
		}
	}

	/**
	 * 通过项目模板api获取项目模板信息
	 * 1. 通过egg.js搭建一套后端系统
	 * 2. 通过npm存储项目模板
	 * 3. 将项目模板存储到mongodb中
	 * 4. 通过egg.js获取mongodb中的数据并通过api返回
	 */
	async downloadTemplate() {
		const { projectTemplate } = this.projectInfo;
		const templateInfo = this.template.find(
			(temp) => temp.npmName === projectTemplate
		);
    const targetPath = path.resolve(userHome, '.allride-cli', 'template');
    const storeDir = path.resolve(userHome, '.allride-cli', 'template', 'node_modules');
    const { npmName, version } = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    if (!await templateNpm.exists()) {
      const spinnerString = "▉▊▋▌▍▎▏▎▍▌▋▊▉";
      const loadingMessage = '全速下载模板中，不爽可以ctrl+C';
      const spinner = spinnerStart(loadingMessage, spinnerString);
      await sleep(1500);
      await templateNpm.install();
      spinner.stop(true);
    } else {
      await templateNpm.update();
    }
	}

	async prepare() {
		// 检查项目模板是否为空
		const template = await getProjectTemplate();
		if (!template || template.length === 0) {
			throw new Error('项目模板不存在');
		}
		this.template = template;
		const localPath = process.cwd();
		let ifContinue = false;
		// 1. 判断当前目录是否为空
		if (!this.isDirEmpty(localPath)) {
			// 2. 是否启动强制更新
			// 如果没有--force 或 -f
			if (!this.force) {
				// 询问是否继续创建
				ifContinue = (
					await inquirer.prompt({
						type: 'confirm',
						name: 'ifContinue',
						default: false,
						message: '当前文件夹不为空，是否继续创建项目？',
					})
				).ifContinue;
			}
			// 用户选择不继续创建
			if (!ifContinue) {
				return;
			}
			// 如果强制创建
			if (ifContinue || this.force) {
				// 给用户做二次确认
				const { confirmDelete } = await inquirer.prompt({
					type: 'confirm',
					name: 'confirmDelete',
					default: false,
					message: '是否确认清空当前目录下文件？',
				});
				// 清空当前目录
				if (confirmDelete) {
					fse.emptyDirSync(localPath);
				}
			}
		}

		return await this.getProjectInfo();
	}

	async getProjectInfo() {
		let projectInfo = {};
		// 3. 选择项目或者组件
		const { type } = await inquirer.prompt({
			type: 'list',
			name: 'type',
			message: '请选择初始化类型',
			default: TYPE_PROJECT,
			choices: [
				{ name: '项目', value: TYPE_PROJECT },
				{ name: '组件', value: TYPE_COMPONENT },
			],
		});
		log.verbose(type);

		// 4. 获取项目基本信息  => return 项目基本信息(object)
		if (type === TYPE_PROJECT) {
			const project = await inquirer.prompt([
				{
					type: 'input',
					name: 'projectName',
					message: '请输入项目名称',
					default: '',
					validate: function (v) {
						const done = this.async();
						setTimeout(function () {
							const valid = /^[a-zA-Z]+([-][a-zA-Z0-9]*|[_][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
								v
							);
							if (!valid) {
								done(
									'需要提供有效的项目名称(首字符为英文字母，字符仅允许下划线和连字符, 末尾为数字或英文字母)'
								);
								return;
							}
							done(null, true);
						}, 0);
					},
					filter: function (v) {
						return v;
					},
				},
				{
					type: 'input',
					name: 'projectVersion',
					message: '请输入项目版本号',
					default: '1.0.0',
					validate: function (v) {
						const done = this.async();
						setTimeout(function () {
							const valid = !!semver.valid(v);
							if (!valid) {
								done('请输入合法的版本号(eg: 1.1.1 or v1.1.0)');
								return;
							}
							done(null, true);
						}, 0);
					},
					filter: function (v) {
						return !!semver.valid(v) ? semver.valid(v) : v;
					},
				},
				{
					type: 'list',
					name: 'projectTemplate',
					message: '请选择项目模板',
					choices: this.createTemplateChoice(),
				},
			]);
			projectInfo = {
				type,
				...project,
			};
		} else if (type === TYPE_COMPONENT) {
		}

		return projectInfo;
	}

	isDirEmpty(localPath) {
		let fileList = fs.readdirSync(localPath);
		fileList = fileList.filter(
			(file) => !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
		);
		return !fileList || fileList.length <= 0;
	}

	createTemplateChoice() {
		return this.template.map((item) => ({
			name: item.name,
			value: item.npmName,
		}));
	}
}

function init(argv) {
	return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
