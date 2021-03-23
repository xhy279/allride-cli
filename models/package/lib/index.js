'use strict';
const { isObject } = require('@allride-cli/utils');
const pkgDir = require('pkg-dir').sync;
const path = require('path');
const formatPath = require('@allride-cli/format-path');
const {
	getDefaultRegistry,
	getNpmLatestVersion,
} = require('@allride-cli/get-npm-info');
const npminstall = require('npminstall');
const pathExists = require('path-exists').sync;
const fse = require('fs-extra');

class Package {
	constructor(options) {
		if (!options) {
			throw new Error('options参数不能为空');
		}
		if (!isObject(options)) {
			throw new Error('Package类需要参数类型为对象的Options');
		}
		// pkg目标路径
		this.targetPath = options.targetPath;
		// pkg缓存路径
		this.storeDir = options.storeDir;
		// pkg的name
		this.packageName = options.packageName;
		// pkg的version
		this.packageVersion = options.packageVersion;
		// package的缓存目录前缀
		this.cacheFilePathPrefix = this.packageName.replace('/', '_');
	}

	async prepare() {
		if (this.storeDir && !pathExists(this.storeDir)) {
			fse.mkdirpSync(this.storeDir);
		}
		if (this.packageVersion === 'latest') {
			this.packageVersion = await getNpmLatestVersion(this.packageName);
		}
	}

	get cacheFilePath() {
		return path.resolve(
			this.storeDir,
			`_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
		);
	}

	getCacheFilePath(packageVersion) {
		return path.resolve(
			this.storeDir,
			`_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
		);
	}

	// 判断当前Package是否存在
	async exists() {
		// 缓存模式未指定path
		if (this.storeDir) {
			await this.prepare();
			return pathExists(this.cacheFilePath);
		} else {
			// 指定path安装
			return pathExists(this.targetPath);
		}
	}

	// 安装package
	async install() {
		await this.prepare();
		return npminstall({
			root: this.targetPath,
			storeDir: this.storeDir,
			registry: getDefaultRegistry(),
			pkgs: [{ name: this.packageName, version: this.packageVersion }],
		});
	}

	// 更新package
	// 1. 获取最新的npm模块版本号
	// 2. 查询最新版本号对应的路径存在
	// 3. 如果不存在，直接安装最新版本
	async update() {
		await this.prepare();
		const latestPackageVersion = await getNpmLatestVersion(this.packageName);
		if (!pathExists(this.getCacheFilePath(latestPackageVersion))) {
			await npminstall({
				root: this.targetPath,
				storeDir: this.storeDir,
				registry: getDefaultRegistry(),
				pkgs: [{ name: this.packageName, version: latestPackageVersion }],
			});
			this.packageVersion = latestPackageVersion;
		}
	}

	// 获取入口文件路径
	// 1. 获取package.json所在目录
	// 2. 读取package.json
	// 3. 寻找main/lib
	// 4. 路径兼容（macOS, windows）
	getRootFilePath() {
		function _getRootFile(p) {
			const dir = pkgDir(p);
			if (dir) {
				const pkgJsonFile = require(path.resolve(dir, 'package.json'));
				if (pkgJsonFile && pkgJsonFile.main) {
					return formatPath(path.resolve(dir, pkgJsonFile.main));
				}
			}
			return null;
		}

		if (this.storeDir) {
			return _getRootFile(this.cacheFilePath);
		} else {
			return _getRootFile(this.targetPath);
		}
	}
}

module.exports = Package;
