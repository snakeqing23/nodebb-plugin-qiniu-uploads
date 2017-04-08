var Package = require("./package.json");

var qiniu = require("qiniu"),
	mime = require("mime"),
	uuid = require("uuid").v4,
	fs = require("fs"),
	request = require("request"),
	path = require("path"),
	winston = module.parent.require("winston"),
	nconf = module.parent.require('nconf'),
	gm = require("gm"),
	im = gm.subClass({imageMagick: true}),
	meta = module.parent.require("./meta"),
	db = module.parent.require("./database");

var plugin = {}

"use strict";

var qiniuConn = null;
var settings = {
	"accessKeyId": false,
	"secretAccessKey": false,
	"bucket": process.env.QINIU_UPLOADS_BUCKET || undefined,
	"host": process.env.QINIU_UPLOADS_HOST || "qiniu.com",
	"path": process.env.QINIU_UPLOADS_PATH || undefined
};

var accessKeyIdFromDb = false;
var secretAccessKeyFromDb = false;

function fetchSettings(callback) {
	db.getObjectFields(Package.name, Object.keys(settings), function (err, newSettings) {
		if (err) {
			winston.error(err.message);
			if (typeof callback === "function") {
				callback(err);
			}
			return;
		}

		accessKeyIdFromDb = false;
		secretAccessKeyFromDb = false;

		if (newSettings.accessKeyId) {
			settings.accessKeyId = newSettings.accessKeyId;
			accessKeyIdFromDb = true;
		} else {
			settings.accessKeyId = false;
		}

		if (newSettings.secretAccessKey) {
			settings.secretAccessKey = newSettings.secretAccessKey;
			secretAccessKeyFromDb = false;
		} else {
			settings.secretAccessKey = false;
		}

		if (!newSettings.bucket) {
			settings.bucket = process.env.QINIU_UPLOADS_BUCKET || "";
		} else {
			settings.bucket = newSettings.bucket;
		}

		if (!newSettings.host) {
			settings.host = process.env.QINIU_UPLOADS_HOST || "";
		} else {
			settings.host = newSettings.host;
		}

		if (!newSettings.path) {
			settings.path = process.env.QINIU_UPLOADS_PATH || "";
		} else {
			settings.path = newSettings.path;
		}

		if (settings.accessKeyId && settings.secretAccessKey) {
			qiniu.config.update({
				accessKeyId: settings.accessKeyId,
				secretAccessKey: settings.secretAccessKey
			});
		}

		if (typeof callback === "function") {
			callback();
		}
	});
}

function getQiniuConn() {
	if (!qiniuConn) {
		qiniuConn = new qiniu();
	}

	return qiniuConn;
}

function makeError(err) {
	if (err instanceof Error) {
		err.message = Package.name + " :: " + err.message;
	} else {
		err = new Error(Package.name + " :: " + err);
	}

	winston.error(err.message);
	return err;
}

plugin.activate = function (data) {
	if (data.id === 'nodebb-plugin-qiniu-uploads') {
		fetchSettings();
	}

};

plugin.deactivate = function (data) {
	if (data.id === 'nodebb-plugin-qiniu-uploads') {
		qiniuConn = null;
	}
};

plugin.load = function (params, callback) {
	fetchSettings(function (err) {
		if (err) {
			return winston.error(err.message);
		}
		var adminRoute = "/admin/plugins/qiniu-uploads";

		params.router.get(adminRoute, params.middleware.applyCSRF, params.middleware.admin.buildHeader, renderAdmin);
		params.router.get("/api" + adminRoute, params.middleware.applyCSRF, renderAdmin);

		params.router.post("/api" + adminRoute + "/qiniuSettings", qiniuSettings);
		params.router.post("/api" + adminRoute + "/credentials", credentials);

		callback();
	});
};

function renderAdmin(req, res) {
	// Regenerate csrf token
	var token = req.csrfToken();

	var forumPath = nconf.get('url');
	if(forumPath.split("").reverse()[0] != "/" ){
		forumPath = forumPath + "/";
	}
	var data = {
		bucket: settings.bucket,
		host: settings.host,
		path: settings.path,
		forumPath: forumPath,
		accessKeyId: (accessKeyIdFromDb && settings.accessKeyId) || "",
		secretAccessKey: (accessKeyIdFromDb && settings.secretAccessKey) || "",
		csrf: token
	};

	res.render("admin/plugins/qiniu-uploads", data);
}

function qiniuSettings(req, res, next) {
	var data = req.body;
	var newSettings = {
		bucket: data.bucket || "",
		host: data.host || "",
		path: data.path || ""
	};

	saveSettings(newSettings, res, next);
}

function credentials(req, res, next) {
	var data = req.body;
	var newSettings = {
		accessKeyId: data.accessKeyId || "",
		secretAccessKey: data.secretAccessKey || ""
	};

	saveSettings(newSettings, res, next);
}

function saveSettings(settings, res, next) {
	db.setObject(Package.name, settings, function (err) {
		if (err) {
			return next(makeError(err));
		}

		fetchSettings();
		res.json("Saved!");
	});
}

plugin.uploadImage = function (data, callback) {
	var image = data.image;

	if (!image) {
		winston.error("invalid image" );
		return callback(new Error("invalid image"));
	}

	//check filesize vs. settings
	if (image.size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
		winston.error("error:file-too-big, " + meta.config.maximumFileSize );
		return callback(new Error("[[error:file-too-big, " + meta.config.maximumFileSize + "]]"));
	}

	var type = image.url ? "url" : "file";
	var allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif'];

	if (type === "file") {
		if (!image.path) {
			return callback(new Error("invalid image path"));
		}

		if (allowedMimeTypes.indexOf(mime.lookup(image.path)) === -1) {
			return callback(new Error("invalid mime type"));
		}

		fs.readFile(image.path, function (err, buffer) {
			uploadToQiniu(image.name, err, buffer, callback);
		});
	}
	else {
		if (allowedMimeTypes.indexOf(mime.lookup(image.url)) === -1) {
			return callback(new Error("invalid mime type"));
		}
		var filename = image.url.split("/").pop();

		var imageDimension = parseInt(meta.config.profileImageDimension, 10) || 128;

		// Resize image.
		im(request(image.url), filename)
			.resize(imageDimension + "^", imageDimension + "^")
			.stream(function (err, stdout, stderr) {
				if (err) {
					return callback(makeError(err));
				}

				// This is sort of a hack - We"re going to stream the gm output to a buffer and then upload.
				// See https://github.com/aws/aws-sdk-js/issues/94
				var buf = new Buffer(0);
				stdout.on("data", function (d) {
					buf = Buffer.concat([buf, d]);
				});
				stdout.on("end", function () {
					uploadToQiniu(filename, null, buf, callback);
				});
			});
	}
};

plugin.uploadFile = function (data, callback) {
	var file = data.file;

	if (!file) {
		return callback(new Error("invalid file"));
	}

	if (!file.path) {
		return callback(new Error("invalid file path"));
	}

	//check filesize vs. settings
	if (file.size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
		winston.error("error:file-too-big, " + meta.config.maximumFileSize );
		return callback(new Error("[[error:file-too-big, " + meta.config.maximumFileSize + "]]"));
	}

	fs.readFile(file.path, function (err, buffer) {
		uploadToQiniu(file.name, err, buffer, callback);
	});
};

function uploadToQiniu(filename, err, buffer, callback) {
	if (err) {
		return callback(makeError(err));
	}

	var qiniuPath;
	if (settings.path && 0 < settings.path.length) {
		qiniuPath = settings.path;

		if (!qiniuPath.match(/\/$/)) {
			// Add trailing slash
			qiniuPath = qiniuPath + "/";
		}
	}
	else {
		qiniuPath = "/";
	}

	var qiniuKeyPath = qiniuPath.replace(/^\//, ""); // qiniu Key Path should not start with slash.

	var params = {
		Bucket: settings.bucket,
		ACL: "public-read",
		Key: qiniuKeyPath + uuid() + path.extname(filename),
		Body: buffer,
		ContentLength: buffer.length,
		ContentType: mime.lookup(filename)
	};

	//TODO eqi, use qiniu put file API
	getQiniuConn().putObject(params, function (err) {
		if (err) {
			return callback(makeError(err));
		}

		// amazon has https enabled, we use it by default
		var host = "https://" + params.Bucket +".qiniu.amazonaws.com";
		if (settings.host && 0 < settings.host.length) {
			host = settings.host;
			// host must start with http or https
			if (!host.startsWith("http")) {
				host = "http://" + host;
			}
		}

		callback(null, {
			name: filename,
			url: host + "/" + params.Key
		});
	});
}

var admin = plugin.admin = {};

admin.menu = function (custom_header, callback) {
	custom_header.plugins.push({
		"route": "/plugins/qiniu-uploads",
		"icon": "fa-envelope-o",
		"name": "qiniu Uploads"
	});

	callback(null, custom_header);
};

module.exports = plugin;
