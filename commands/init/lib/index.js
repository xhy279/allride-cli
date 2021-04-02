'use strict';
const Command = require('@allride-cli/command');
const Package = require('@allride-cli/package');
const log = require('@allride-cli/log');
const { spinnerStart, sleep, execAsync } = require('@allride-cli/utils');

const inquirer = require('inquirer');
const fs = require('fs');
const fse = require('fs-extra');
const semver = require('semver');
const ejs = require('ejs');
const glob = require('glob');
const userHome = require('user-home');

const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';
const WHITE_COMMAND = ['npm', 'cnpm', 'yarn'];

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
			await this.installTemplate();
		} catch (e) {
			log.error(e.message);
			if (process.env.LOG_LEVEL === 'verbose') {
				console.log(e);
			}
		}
	}

	async installTemplate() {
		if (this.templateInfo) {
			if (!this.templateInfo.type) {
				this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
			}
			if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
				await this.installNormalTemplate();
			} else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
				await this.installCustomTemplate();
			} else {
				throw new Error('无法识别项目模板类型');
			}
		} else {
			throw new Error('模板信息不存在');
		}
	}

	async ejsRender({ ignore }) {
		const dir = process.cwd();
		const projectInfo = this.projectInfo;
		return new Promise((resolve, reject) => {
			glob(
				'**',
				{
					cwd: dir,
					ignore: ignore || '',
					nodir: true,
				},
				(err, files) => {
					if (err) {
						reject(err);
					}
					Promise.all(
						files.map((file) => {
							const filePath = path.join(dir, file);
							return new Promise((resolve1, reject1) => {
								ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
									if (err) {
										reject1(err);
									} else {
										fse.writeFileSync(filePath, result);
										resolve1(result);
									}
								});
							});
						})
					)
						.then(() => {
							resolve();
						})
						.catch((e) => {
							if (process.env.LOG_LEVEL === 'verbose') {
								console.log(e);
							}
						});
				}
			);
		});
	}

	async installNormalTemplate() {
		let spinner = spinnerStart('正在安装模板中', '|/-\\');
		await sleep();
		try {
			const templatePath = path.resolve(
				this.templateNpm.cacheFilePath,
				'template'
			);
			const targetInstallPath = process.cwd();
			fse.ensureDirSync(templatePath);
			fse.ensureDirSync(targetInstallPath);
			fse.copySync(templatePath, targetInstallPath);
		} catch (error) {
			throw error;
		} finally {
			spinner.stop(true);
			if (!this.isDirEmpty(process.cwd())) {
				log.success(`${this.templateInfo.name}安装成功`);
			}
		}
		const ignore = ['node_modules/**', 'public/**', '**/*.png', '**/*.gif'];
		await this.ejsRender({ ignore });
		// install deps, start command
		const { installCommand, startCommand } = this.templateInfo;
		await this.execCommand(installCommand, '安装依赖失败！');
		await this.execCommand(startCommand, '执行启动命令失败');
	}

	async execCommand(cmd, errorMsg) {
		let installResult;
		if (cmd) {
			const cmdWithArgs = cmd.split(' ');
			const command = this.checkCommand(cmdWithArgs[0]);
			if (!command) {
				throw new Error(`命令${command}不存在！`);
			}
			const args = cmdWithArgs.slice(1);
			installResult = await execAsync(command, args, {
				stdio: 'inherit',
				cwd: process.cwd(),
			});
		}

		if (installResult !== 0) {
			throw new Error(errorMsg);
		}
		return installResult;
	}

	checkCommand(cmd) {
		return WHITE_COMMAND.indexOf(cmd) < 0 ? null : cmd;
	}

	async installCustomTemplate() {
		// console.log(this.templateInfo);
	}

	/**
	 * 暂时用github pages host静态json文件
	 */
	async downloadTemplate() {
		const { projectTemplate } = this.projectInfo;
		const templateInfo = this.template.find(
			(temp) => temp.npmName === projectTemplate
		);
		this.templateInfo = templateInfo;
		const targetPath = path.resolve(userHome, '.allride-cli', 'template');
		const storeDir = path.resolve(
			userHome,
			'.allride-cli',
			'template',
			'node_modules'
		);
		const { npmName, version } = templateInfo;
		const templateNpm = new Package({
			targetPath,
			storeDir,
			packageName: npmName,
			packageVersion: version,
		});
		this.templateNpm = templateNpm;
		if (!(await templateNpm.exists())) {
			const spinnerString = '▉▊▋▌▍▎▏▎▍▌▋▊▉';
			const loadingMessage = '全速下载模板中，不爽可以ctrl+C';
			const spinner = spinnerStart(loadingMessage, spinnerString);
			await sleep(1500);
			try {
				await templateNpm.install();
			} catch (error) {
				throw error;
			} finally {
				spinner.stop(true);
				if (templateNpm.exists()) {
					log.success('下载模板成功');
					this.templateInfo = templateInfo;
				}
			}
		} else {
			const spinnerString = '⣾⣽⣻⢿⡿⣟⣯⣷';
			const loadingMessage = '全速更新模板中，不爽可以ctrl+C';
			const spinner = spinnerStart(loadingMessage, spinnerString);
			await sleep(1500);
			try {
				await templateNpm.update();
			} catch (error) {
				throw error;
			} finally {
				spinner.stop(true);
				if (templateNpm.exists()) {
					log.success('更新模板成功');
					this.templateInfo = templateInfo;
				}
			}
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
					let spinner = spinnerStart('正在清空当前目录, 细节不重要', '■□▪▫');
					await sleep(1500);
					await fse.emptyDir(localPath);
					spinner.stop(true);
				}
			}
		}

		return await this.getProjectInfo();
	}

	async getProjectInfo() {
		function isValidName(v) {
			return /^[a-zA-Z]+([-][a-zA-Z0-9]*|[_][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
				v
			);
		}
		let projectInfo = {};
		let isProjectNameValid = false;
		if (isValidName(this.projectName)) {
			isProjectNameValid = true;
			projectInfo.projectName = this.projectName;
		}
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
			const projectPrompt = [];
			const projectNamePrompt = {
				type: 'input',
				name: 'projectName',
				message: '请输入项目名称',
				default: '',
				validate: function (v) {
					const done = this.async();
					setTimeout(function () {
						if (!isValidName(v)) {
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
			};
			if (!isProjectNameValid) {
				projectPrompt.push(projectNamePrompt);
			}
			projectPrompt.push(
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
				{
					type: 'list',
					name: 'primeMember',
					message: '是否付费开启心悦会员模式',
					default: true,
					choices: [{ name: '是', value: true }],
				}
			);
			const project = await inquirer.prompt(projectPrompt);
			projectInfo = {
        ...projectInfo,
				type,
				...project,
			};
		} else if (type === TYPE_COMPONENT) {
		}
		if (projectInfo.projectName) {
			projectInfo.name = projectInfo.projectName;
			projectInfo.className = require('kebab-case')(
				projectInfo.projectName
			).replace(/^-/, '');
		}
		if (projectInfo.projectVersion) {
			projectInfo.version = projectInfo.projectVersion;
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
