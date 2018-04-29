"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var path_1 = require("path");
var webdav_server_1 = require("webdav-server");
var fs = require("fs");
var GaleryFileSystemResource = /** @class */ (function () {
    function GaleryFileSystemResource(data) {
        if (!data) {
            this.props = new webdav_server_1.v2.LocalPropertyManager();
            this.locks = new webdav_server_1.v2.LocalLockManager();
        }
        else {
            var rs = data;
            this.props = new webdav_server_1.v2.LocalPropertyManager(rs.props);
            this.locks = new webdav_server_1.v2.LocalLockManager();
        }
    }
    return GaleryFileSystemResource;
}());
exports.GaleryFileSystemResource = GaleryFileSystemResource;
var GalerySerializer = /** @class */ (function () {
    function GalerySerializer() {
    }
    GalerySerializer.prototype.uid = function () {
        return 'GaleryFSSerializer-1.0.0';
    };
    GalerySerializer.prototype.serialize = function (fs, callback) {
        callback(null, {
            resources: fs.resources,
            rootPath: fs.rootPath
        });
    };
    GalerySerializer.prototype.unserialize = function (serializedData, callback) {
        // tslint:disable-next-line:no-use-before-declare
        var fs = new GaleryFileSystem(serializedData.rootPath);
        fs.resources = serializedData.resources;
        callback(null, fs);
    };
    return GalerySerializer;
}());
exports.GalerySerializer = GalerySerializer;
exports.GalerySerializerVersions = {
    versions: {
        '1.0.0': GalerySerializer
    },
    instances: [
        new GalerySerializer()
    ]
};
var GaleryFileSystem = /** @class */ (function (_super) {
    __extends(GaleryFileSystem, _super);
    function GaleryFileSystem(rootPath) {
        var _this = _super.call(this, new GalerySerializer()) || this;
        _this.rootPath = rootPath;
        _this.resources = {
            '/': new GaleryFileSystemResource()
        };
        return _this;
    }
    GaleryFileSystem.prototype.getRealPath = function (path) {
        var sPath = path.toString();
        return {
            realPath: path_1.join(this.rootPath, sPath.substr(1)),
            resource: this.resources[sPath]
        };
    };
    GaleryFileSystem.prototype._create = function (path, ctx, _callback) {
        var _this = this;
        var realPath = this.getRealPath(path).realPath;
        var callback = function (e) {
            if (!e)
                _this.resources[path.toString()] = new GaleryFileSystemResource();
            else if (e)
                e = webdav_server_1.v2.Errors.ResourceAlreadyExists;
            _callback(e);
        };
        if (ctx.type.isDirectory)
            fs.mkdir(realPath, callback);
        else {
            if (!fs.constants || !fs.constants.O_CREAT) { // node v5.* and lower
                fs.writeFile(realPath, new Buffer(0), callback);
            }
            else { // node v6.* and higher
                fs.open(realPath, fs.constants.O_CREAT, function (e, fd) {
                    if (e)
                        return callback(e);
                    fs.close(fd, callback);
                });
            }
        }
    };
    GaleryFileSystem.prototype._delete = function (path, ctx, _callback) {
        var _this = this;
        var realPath = this.getRealPath(path).realPath;
        var callback = function (e) {
            if (!e)
                delete _this.resources[path.toString()];
            _callback(e);
        };
        this.type(ctx.context, path, function (e, type) {
            if (e)
                return callback(webdav_server_1.v2.Errors.ResourceNotFound);
            if (type.isDirectory) {
                if (ctx.depth === 0)
                    return fs.rmdir(realPath, callback);
                _this.readDir(ctx.context, path, function (e, files) {
                    var nb = files.length + 1;
                    var done = function (e) {
                        if (nb < 0)
                            return;
                        if (e) {
                            nb = -1;
                            return callback(e);
                        }
                        if (--nb === 0)
                            fs.rmdir(realPath, callback);
                    };
                    files.forEach(function (file) { return _this["delete"](ctx.context, path.getChildPath(file), ctx.depth === -1 ? -1 : ctx.depth - 1, done); });
                    done();
                });
            }
            else
                fs.unlink(realPath, callback);
        });
    };
    GaleryFileSystem.prototype._openWriteStream = function (path, ctx, callback) {
        var _this = this;
        var _a = this.getRealPath(path), realPath = _a.realPath, resource = _a.resource;
        fs.open(realPath, 'w+', function (e, fd) {
            if (e)
                return callback(webdav_server_1.v2.Errors.ResourceNotFound);
            if (!resource)
                _this.resources[path.toString()] = new GaleryFileSystemResource();
            callback(null, fs.createWriteStream(null, { fd: fd }));
        });
    };
    GaleryFileSystem.prototype._openReadStream = function (path, ctx, callback) {
        var realPath = this.getRealPath(path).realPath;
        fs.open(realPath, 'r', function (e, fd) {
            if (e)
                return callback(webdav_server_1.v2.Errors.ResourceNotFound);
            callback(null, fs.createReadStream(null, { fd: fd }));
        });
    };
    GaleryFileSystem.prototype._move = function (pathFrom, pathTo, ctx, callback) {
        var _this = this;
        var realPathFrom = this.getRealPath(pathFrom).realPath;
        var realPathTo = this.getRealPath(pathTo).realPath;
        var rename = function (overwritten) {
            fs.rename(realPathFrom, realPathTo, function (e) {
                if (e)
                    return callback(e);
                _this.resources[realPathTo] = _this.resources[realPathFrom];
                delete _this.resources[realPathFrom];
                callback(null, overwritten);
            });
        };
        fs.access(realPathTo, function (e) {
            if (e) { // destination doesn't exist
                rename(false);
            }
            else { // destination exists
                if (!ctx.overwrite)
                    return callback(webdav_server_1.v2.Errors.ResourceAlreadyExists);
                _this["delete"](ctx.context, pathTo, function (e) {
                    if (e)
                        return callback(e);
                    rename(true);
                });
            }
        });
    };
    GaleryFileSystem.prototype._size = function (path, ctx, callback) {
        this.getStatProperty(path, ctx, 'size', callback);
    };
    /**
     * Get a property of an existing resource (object property, not WebDAV property). If the resource doesn't exist, it is created.
     *
     * @param path Path of the resource
     * @param ctx Context of the method
     * @param propertyName Name of the property to get from the resource
     * @param callback Callback returning the property object of the resource
     */
    GaleryFileSystem.prototype.getPropertyFromResource = function (path, ctx, propertyName, callback) {
        var resource = this.resources[path.toString()];
        if (!resource) {
            resource = new GaleryFileSystemResource();
            this.resources[path.toString()] = resource;
        }
        callback(null, resource[propertyName]);
    };
    GaleryFileSystem.prototype._lockManager = function (path, ctx, callback) {
        this.getPropertyFromResource(path, ctx, 'locks', callback);
    };
    GaleryFileSystem.prototype._propertyManager = function (path, ctx, callback) {
        this.getPropertyFromResource(path, ctx, 'props', callback);
    };
    GaleryFileSystem.prototype._readDir = function (path, ctx, callback) {
        var realPath = this.getRealPath(path).realPath;
        fs.readdir(realPath, function (e, files) {
            callback(e ? webdav_server_1.v2.Errors.ResourceNotFound : null, files);
        });
    };
    GaleryFileSystem.prototype.getStatProperty = function (path, ctx, propertyName, callback) {
        var realPath = this.getRealPath(path).realPath;
        fs.stat(realPath, function (e, stat) {
            if (e)
                return callback(webdav_server_1.v2.Errors.ResourceNotFound);
            callback(null, stat[propertyName]);
        });
    };
    GaleryFileSystem.prototype.getStatDateProperty = function (path, ctx, propertyName, callback) {
        this.getStatProperty(path, ctx, propertyName, function (e, value) { return callback(e, value ? value.valueOf() : value); });
    };
    GaleryFileSystem.prototype._creationDate = function (path, ctx, callback) {
        this.getStatDateProperty(path, ctx, 'birthtime', callback);
    };
    GaleryFileSystem.prototype._lastModifiedDate = function (path, ctx, callback) {
        this.getStatDateProperty(path, ctx, 'mtime', callback);
    };
    GaleryFileSystem.prototype._type = function (path, ctx, callback) {
        var realPath = this.getRealPath(path).realPath;
        if (realPath.indexOf('.url') !== -1)
            return callback(webdav_server_1.v2.Errors.ResourceNotFound);
        fs.stat(realPath, function (e, stat) {
            if (e)
                return callback(webdav_server_1.v2.Errors.ResourceNotFound);
            callback(null, stat.isDirectory() ? webdav_server_1.v2.ResourceType.Directory : webdav_server_1.v2.ResourceType.File);
        });
    };
    return GaleryFileSystem;
}(webdav_server_1.v2.FileSystem));
exports.GaleryFileSystem = GaleryFileSystem;
