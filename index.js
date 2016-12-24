'use strict';

var fs = require('fs');
var path = require('path');
var minify = require('html-minifier').minify;
var CleanCSS = require('clean-css');

module.exports = function (content, options, targetDir) {
	options = options || {};
	options.base = options.base || './';

	content = processStyleUrls(content, options, targetDir);
	content = processTemplateUrl(content, options, targetDir);

	return content;
};

function processStyleUrls(content, options, targetDir) {
	let re = /styleUrls\s*:\s*(\[[^](.[^]*?)\])/g;
	let matches = content.match(re);

	if (matches === null || matches.length <= 0) {
		return content;
	}

	matches.forEach(function () {
		let exec = re.exec(content);
		let style = exec[0];
		let urls = exec[1];
		urls = urls.replace(/'/g, '"');
		urls = JSON.parse(urls);

		var result = urls.map(function (url) {
			let file = fs.readFileSync(getAbsoluteUrl(url, options, targetDir), 'utf-8');

			if (options.compress) {
				file = new CleanCSS().minify(file).styles;
			} else {
				file = file.replace(/[\r\n]/g, '');
			}

			return file;
		}).join('');

		content = content.replace(style, 'styles: [`' + result + '`]');
	});

	return content;
}

function processTemplateUrl(content, options, targetDir) {
	let re = /templateUrl\s*:\s*(?:"([^"]+)"|'([^']+)')/g;
	let matches = content.match(re);

	if (matches === null || matches.length <= 0) {
		return content;
	}

	matches.forEach(function () {
		let exec = re.exec(content);
		let template = exec[0];
		let url = exec[1] || exec[2];

		let file = fs.readFileSync(getAbsoluteUrl(url, options, targetDir), 'utf-8');
		if (options.compress) {
			file = minify(file, {
				caseSensitive: true,
				collapseWhitespace: true,
				removeComments: true,
				/*
				 ng2 bindings break the parser for html-minifer, so the
				 following blocks the processing of ()="" and []="" attributes
				 */
				ignoreCustomFragments: [/\s\[.*\]=\"[^\"]*\"/, /\s\([^)"]+\)=\"[^\"]*\"/]
			});
		} else {
			file = file.replace(/[\r\n]\s*/g, '');
		}

		// escape quote chars
		file = file.replace(new RegExp('`', 'g'), '\\`');

		content = content.replace(template, 'template: `' + file + '`');
	});

	return content;
}

function getAbsoluteUrl(url, options, targetDir) {
	return options.relative ? path.join(targetDir, url) : path.join(options.base, url);
}
