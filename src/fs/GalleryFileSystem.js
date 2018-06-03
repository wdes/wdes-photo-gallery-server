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
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var webdav_server_1 = require("webdav-server");
var fs = require("fs");
var GalleryFileSystemResource = /** @class */ (function () {
    function GalleryFileSystemResource(data) {
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
    return GalleryFileSystemResource;
}());
exports.GalleryFileSystemResource = GalleryFileSystemResource;
var GallerySerializer = /** @class */ (function () {
    function GallerySerializer() {
    }
    GallerySerializer.prototype.uid = function () {
        return 'GalleryFSSerializer-1.0.0';
    };
    GallerySerializer.prototype.serialize = function (fs, callback) {
        callback(null, {
            resources: fs.resources,
            rootPath: fs.rootPath
        });
    };
    GallerySerializer.prototype.unserialize = function (serializedData, callback) {
        // tslint:disable-next-line:no-use-before-declare
        var fs = new GalleryFileSystem(serializedData.rootPath);
        fs.resources = serializedData.resources;
        callback(null, fs);
    };
    return GallerySerializer;
}());
exports.GallerySerializer = GallerySerializer;
exports.GallerySerializerVersions = {
    versions: {
        '1.0.0': GallerySerializer,
    },
    instances: [
        new GallerySerializer()
    ]
};
var File = /** @class */ (function () {
    function File(path, nameFile, filemtime, filectime, sha1File) {
        this.path = path;
        this.nameFile = nameFile;
        this.filectime = filectime;
        this.filemtime = filemtime;
        this.sha1File = sha1File;
    }
    return File;
}());
exports.File = File;
var Directory = /** @class */ (function () {
    function Directory(nameContainer, pathContainer, metadata) {
        this.nameContainer = nameContainer;
        this.pathContainer = pathContainer;
        this.metadata = metadata;
        this.filectime = 0;
        this.filemtime = 0;
        this.path = "";
    }
    return Directory;
}());
exports.Directory = Directory;
var GalleryFileSystem = /** @class */ (function (_super) {
    __extends(GalleryFileSystem, _super);
    function GalleryFileSystem(rootPath) {
        var _this = _super.call(this, new GallerySerializer()) || this;
        _this.rootPath = rootPath;
        _this._rootPath = rootPath;
        _this.resources = {
            '/': new GalleryFileSystemResource()
        };
        _this.data = {
            '/': new Directory("Root", "/", "{}")
        };
        return _this;
    }
    GalleryFileSystem.prototype.galeriePath = function (path) {
        return path.replace("{galerie}", this._rootPath);
    };
    GalleryFileSystem.prototype.getRealPath = function (path) {
        var sPath = path.toString();
        console.log(this.rootPath, sPath.substr(1), sPath);
        return {
            realPath: path_1.join(this.rootPath, sPath.substr(1)),
            subPath: sPath,
            resource: this.resources[sPath]
        };
    };
    //NOT IMPLEMENTED IN WINDOWS EXPLORER AND WEB EXPLORER
    /*protected _displayName(path : Path, ctx : webdav.DisplayNameInfo, callback : webdav.ReturnCallback<string>) : void {
        const { realPath } = this.getRealPath(path);
        if(realPath !== "/")
            callback(null, "test-"+realPath)
    }*/
    GalleryFileSystem.prototype._create = function (path, ctx, _callback) {
        var _this = this;
        var _a = this.getRealPath(path), realPath = _a.realPath, subPath = _a.subPath;
        console.log("DELETE path:", this.data[subPath].path);
        var callback = function (e) {
            if (!e)
                _this.resources[path.toString()] = new GalleryFileSystemResource();
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
    GalleryFileSystem.prototype._delete = function (path, ctx, _callback) {
        var _this = this;
        var _a = this.getRealPath(path), realPath = _a.realPath, subPath = _a.subPath;
        console.log("DELETE path:", this.data[subPath].path);
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
                    files.forEach(function (file) { return _this.delete(ctx.context, path.getChildPath(file), ctx.depth === -1 ? -1 : ctx.depth - 1, done); });
                    done();
                });
            }
            else
                fs.unlink(realPath, callback);
        });
    };
    GalleryFileSystem.prototype._openWriteStream = function (path, ctx, callback) {
        var _this = this;
        var _a = this.getRealPath(path), realPath = _a.realPath, resource = _a.resource, subPath = _a.subPath;
        console.log("OPENWS path:", this.data[subPath].path);
        fs.open(realPath, 'w+', function (e, fd) {
            if (e)
                return callback(webdav_server_1.v2.Errors.ResourceNotFound);
            if (!resource)
                _this.resources[path.toString()] = new GalleryFileSystemResource();
            callback(null, fs.createWriteStream(null, { fd: fd }));
        });
    };
    GalleryFileSystem.prototype._openReadStream = function (path, ctx, callback) {
        var _a = this.getRealPath(path), realPath = _a.realPath, subPath = _a.subPath;
        console.log("OPENRS path:", this.data[subPath].path);
        fs.readFile(this.data[subPath].path, { encoding: 'base64' }, function (err, data) {
            if (err) {
                throw err;
            }
            // make me a string
            var output = 'base64,' + data;
            // show me!
            console.log(output);
        });
        fs.open(this.data[subPath].path, 'r', function (e, fd) {
            console.log("RS TRY...");
            if (e) {
                console.log("RS ERROR !");
                return callback(webdav_server_1.v2.Errors.ResourceNotFound);
            }
            console.log("RS OK !");
            callback(null, fs.createReadStream(null, { fd: fd }));
        });
    };
    GalleryFileSystem.prototype._move = function (pathFrom, pathTo, ctx, callback) {
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
                _this.delete(ctx.context, pathTo, function (e) {
                    if (e)
                        return callback(e);
                    rename(true);
                });
            }
        });
    };
    GalleryFileSystem.prototype._size = function (path, ctx, callback) {
        var _a = this.getRealPath(path), realPath = _a.realPath, subPath = _a.subPath;
        console.log("SIZE path:", this.data[subPath].path);
        fs.stat(this.data[subPath].path, function (err, stats) {
            callback(null, stats["size"]);
        });
    };
    /**
     * Get a property of an existing resource (object property, not WebDAV property). If the resource doesn't exist, it is created.
     *
     * @param path Path of the resource
     * @param ctx Context of the method
     * @param propertyName Name of the property to get from the resource
     * @param callback Callback returning the property object of the resource
     */
    GalleryFileSystem.prototype.getPropertyFromResource = function (path, ctx, propertyName, callback) {
        var resource = this.resources[path.toString()];
        if (!resource) {
            resource = new GalleryFileSystemResource();
            this.resources[path.toString()] = resource;
        }
        callback(null, resource[propertyName]);
    };
    GalleryFileSystem.prototype._lockManager = function (path, ctx, callback) {
        this.getPropertyFromResource(path, ctx, 'locks', callback);
    };
    GalleryFileSystem.prototype._propertyManager = function (path, ctx, callback) {
        this.getPropertyFromResource(path, ctx, 'props', callback);
    };
    GalleryFileSystem.prototype._readDir = function (path, ctx, callback) {
        var _this = this;
        var subPath = this.getRealPath(path).subPath;
        BasicDB.Select('gfs__Containers', ['nameContainer', 'idContainer'], ['pathContainer', '?'], null, [subPath], function (err, rows, fields) {
            var items = [];
            if (!err) {
                rows.forEach(function (element) {
                    items.push(element.nameContainer);
                    _this.data[((subPath === "/") ? "/" : subPath + "/") + element.nameContainer] = new Directory(element.nameContainer, subPath, "{}");
                });
                //callback(err ? webdav.Errors.ResourceNotFound : null, items);
                BasicDB.Select('gfs__Files', ['nameFile', 'filemtime', 'filectime', 'path'], ['idContainer', 'getIDParentFromPath(?)'], null, [subPath], function (err, rows, fields) {
                    if (!err) {
                        rows.forEach(function (element) {
                            items.push(element.nameFile);
                            _this.data[subPath + "/" + element.nameFile] = new File(_this.galeriePath(element.path), element.nameFile, element.filemtime, element.filectime, "sha1");
                        });
                        console.log("NEW", _this.data);
                        callback(err ? webdav_server_1.v2.Errors.ResourceNotFound : null, items);
                    }
                    //callback(err ? webdav.Errors.ResourceNotFound : null, items);
                });
            }
        });
    };
    GalleryFileSystem.prototype._creationDate = function (path, ctx, callback) {
        var _a = this.getRealPath(path), realPath = _a.realPath, subPath = _a.subPath;
        callback(null, this.data[subPath].filectime);
    };
    GalleryFileSystem.prototype._lastModifiedDate = function (path, ctx, callback) {
        var _a = this.getRealPath(path), realPath = _a.realPath, subPath = _a.subPath;
        callback(null, this.data[subPath].filemtime);
    };
    GalleryFileSystem.prototype._type = function (path, ctx, callback) {
        var _a = this.getRealPath(path), realPath = _a.realPath, subPath = _a.subPath;
        console.log(path, realPath, subPath, this.data.hasOwnProperty(subPath));
        if (this.data.hasOwnProperty(subPath) === false)
            return callback(webdav_server_1.v2.Errors.ResourceNotFound);
        if (realPath.indexOf('.url') !== -1)
            return callback(webdav_server_1.v2.Errors.ResourceNotFound);
        switch (this.data[subPath].constructor) {
            case File:
                return callback(null, webdav_server_1.v2.ResourceType.File);
            case Directory:
                return callback(null, webdav_server_1.v2.ResourceType.Directory);
            default:
                console.log(typeof this.data[subPath]);
                return callback(null, webdav_server_1.v2.ResourceType.NoResource);
        }
        fs.stat(realPath, function (e, stat) {
            if (e)
                return callback(webdav_server_1.v2.Errors.ResourceNotFound);
            callback(null, stat.isDirectory() ? webdav_server_1.v2.ResourceType.Directory : webdav_server_1.v2.ResourceType.File);
        });
    };
    return GalleryFileSystem;
}(webdav_server_1.v2.FileSystem));
exports.GalleryFileSystem = GalleryFileSystem;
