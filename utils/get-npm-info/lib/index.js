'use strict';

module.exports = {
	getNpmInfo,
	getNpmVersions,
	getNpmSemversion,
	getDefaultRegistry,
	getNpmLatestVersion,
};

const axios = require('axios');
const urlJoin = require('url-join');
const semver = require('semver');

function getNpmInfo(npmName, registry) {
	if (!npmName) {
		return null;
	}
	const registryUrl = registry || getDefaultRegistry();
	const npmInfoUrl = urlJoin(registryUrl, npmName);
	return axios
		.get(npmInfoUrl)
		.then((res) => {
			if (res.status === 200) {
				return res.data;
			} else {
				return null;
			}
		})
		.catch((err) => {
			return Promise.reject(err);
		});
}

function getDefaultRegistry(isOriginal = true) {
	return isOriginal
		? 'https://registry.npmjs.org'
		: 'https://registry.npmjs.taobao.org';
}

async function getNpmVersions(npmName, registry) {
	const data = await getNpmInfo(npmName, registry);
	return !data ? [] : Object.keys(data.versions);
}

function getSemverVersions(baseVersion, versions) {
	return versions
		.filter((version) => semver.satisfies(version, `^${baseVersion}`))
		.sort((a, b) => semver.gt(b, a));
}

async function getNpmSemversion(npmName, baseVersion, registry) {
	const versions = await getNpmVersions(npmName, registry);
	const updatedVersions = getSemverVersions(baseVersion, versions);
	if (updatedVersions && updatedVersions.length) {
		return updatedVersions[0];
	}
}

async function getNpmLatestVersion(npmName, registry) {
	const versions = await getNpmVersions(npmName, registry);
	if (versions) {
		return versions.sort((a, b) => semver.gt(b, a));
	}
	return null;
}
