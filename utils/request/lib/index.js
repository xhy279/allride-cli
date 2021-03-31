'use strict';
const axios = require('axios');
const BASE_URL = process.env.CLI_BASE_URL
	? process.env.CLI_BASE_URL
	: 'https://xhy279.github.io/allride-cli-template/api/';

const request = axios.create({
	baseURL: BASE_URL,
	timeout: 5000,
});

request.interceptors.response.use(
	(response) => {
		return response.data;
	},
	(error) => {
		return Promise.reject(error);
	}
);

module.exports = request;
