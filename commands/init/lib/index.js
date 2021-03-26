'use strict';
const inquirer = require('inquirer');
const Command = require('@allride-cli/command');
const log = require('@allride-cli/log');
const fs = require('fs');
const fse = require('fs-extra');
const semver = require('semver');

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
			await this.prepare();
			// 2. 下载模板
			// 3. 安装模板
		} catch (e) {
			log.error(e.message);
		}
	}

	async prepare() {
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
		const projectInfo = {};
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
			const o = await inquirer.prompt([
				{
					type: 'input',
					name: 'projectName',
					message: '请输入项目名称',
					default: '',
					validate: function(v) {
            // 首字符为英文字母，字符仅允许'-_', 末尾为数字和英文字母
						return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v);
					},
					filter: function(v) {
						return v;
					},
				},
				{
          type: 'input',
          name: 'projectVersion',
          message: '请输入项目版本号',
          default: '',
          validate: function (v) {
            return !!semver.valid(v);
          },
          filter: function (v) {
            return !!semver.valid(v) ? semver.valid(v) : v;
          }
        },
			]);
      console.log(o);
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
}

function init(argv) {
	return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
