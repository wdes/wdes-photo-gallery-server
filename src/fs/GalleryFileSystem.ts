import { Readable, Writable } from 'stream'
import { join as pathJoin } from 'path'
import { v2 as webdav } from 'webdav-server'
import * as fs from 'fs'
import { Path } from 'webdav-server/lib/index.v2';

export class GalleryFileSystemResource
{
    props : webdav.LocalPropertyManager
    locks : webdav.LocalLockManager

    constructor(data ?: GalleryFileSystemResource)
    {
        if(!data)
        {
            this.props = new webdav.LocalPropertyManager();
            this.locks = new webdav.LocalLockManager();
        }
        else
        {
            const rs = data as GalleryFileSystemResource;
            this.props = new webdav.LocalPropertyManager(rs.props);
            this.locks = new webdav.LocalLockManager();
        }
    }
}

export class GallerySerializer implements webdav.FileSystemSerializer
{
    uid() : string
    {
        return 'GalleryFSSerializer-1.0.0';
    }

    serialize(fs : GalleryFileSystem, callback : webdav.ReturnCallback<any>) : void
    {
        callback(null, {
            resources: fs.resources,
            rootPath: fs.rootPath
        });
    }

    unserialize(serializedData : any, callback : webdav.ReturnCallback<webdav.FileSystem>) : void
    {
        // tslint:disable-next-line:no-use-before-declare
        const fs = new GalleryFileSystem(serializedData.rootPath);
        fs.resources = serializedData.resources;
        callback(null, fs);
    }
}

export const GallerySerializerVersions = {
    versions: {
        '1.0.0': GallerySerializer,
    },
    instances: [
        new GallerySerializer()
    ] as GallerySerializer[]
}

export class GalleryFileSystem extends webdav.FileSystem
{
    resources : {
        [path : string] : GalleryFileSystemResource
    }

    constructor(public rootPath : string)
    {
        super(new GallerySerializer());

        this.resources = {
            '/': new GalleryFileSystemResource()
        };
    }

    protected getRealPath(path : webdav.Path)
    {
        const sPath = path.toString();
        console.log(this.rootPath, sPath.substr(1), sPath);
        return {
            realPath: pathJoin(this.rootPath, sPath.substr(1)),
            subPath: sPath,
            resource: this.resources[sPath]
        };
    }
    //NOT IMPLEMENTED IN WINDOWS EXPLORER AND WEB EXPLORER
    /*protected _displayName(path : Path, ctx : webdav.DisplayNameInfo, callback : webdav.ReturnCallback<string>) : void {
        const { realPath } = this.getRealPath(path);
        if(realPath !== "/")
            callback(null, "test-"+realPath)
    }*/

    protected _create(path : webdav.Path, ctx : webdav.CreateInfo, _callback : webdav.SimpleCallback) : void
    {
        const { realPath } = this.getRealPath(path);

        const callback = (e) => {
            if(!e)
                this.resources[path.toString()] = new GalleryFileSystemResource();
            else if(e)
                e = webdav.Errors.ResourceAlreadyExists;

            _callback(e);
        }

        if(ctx.type.isDirectory)
            fs.mkdir(realPath, callback);
        else
        {
            if(!fs.constants || !fs.constants.O_CREAT)
            { // node v5.* and lower
                fs.writeFile(realPath, new Buffer(0), callback);
            }
            else
            { // node v6.* and higher
                fs.open(realPath, fs.constants.O_CREAT, (e, fd) => {
                    if(e)
                        return callback(e);
                    fs.close(fd, callback);
                })
            }
        }
    }

    protected _delete(path : webdav.Path, ctx : webdav.DeleteInfo, _callback : webdav.SimpleCallback) : void
    {
        const { realPath } = this.getRealPath(path);

        const callback = (e) => {
            if(!e)
                delete this.resources[path.toString()];
            _callback(e);
        }

        this.type(ctx.context, path, (e, type) => {
            if(e)
                return callback(webdav.Errors.ResourceNotFound);

            if(type.isDirectory)
            {
                if(ctx.depth === 0)
                    return fs.rmdir(realPath, callback);

                this.readDir(ctx.context, path, (e, files) => {
                    let nb = files.length + 1;
                    const done = (e ?: Error) => {
                        if(nb < 0)
                            return;

                        if(e)
                        {
                            nb = -1;
                            return callback(e);
                        }

                        if(--nb === 0)
                            fs.rmdir(realPath, callback);
                    }

                    files.forEach((file) => this.delete(ctx.context, path.getChildPath(file), ctx.depth === -1 ? -1 : ctx.depth - 1, done));
                    done();
                })
            }
            else
                fs.unlink(realPath, callback);
        })
    }

    protected _openWriteStream(path : webdav.Path, ctx : webdav.OpenWriteStreamInfo, callback : webdav.ReturnCallback<Writable>) : void
    {
        const { realPath, resource } = this.getRealPath(path);

        fs.open(realPath, 'w+', (e, fd) => {
            if(e)
                return callback(webdav.Errors.ResourceNotFound);

            if(!resource)
                this.resources[path.toString()] = new GalleryFileSystemResource();

            callback(null, fs.createWriteStream(null, { fd }));
        })
    }

    protected _openReadStream(path : webdav.Path, ctx : webdav.OpenReadStreamInfo, callback : webdav.ReturnCallback<Readable>) : void
    {
        const { realPath } = this.getRealPath(path);

        fs.open(realPath, 'r', (e, fd) => {
            if(e)
                return callback(webdav.Errors.ResourceNotFound);

            callback(null, fs.createReadStream(null, { fd }));
        })
    }

    protected _move(pathFrom : webdav.Path, pathTo : webdav.Path, ctx : webdav.MoveInfo, callback : webdav.ReturnCallback<boolean>) : void
    {
        const { realPath: realPathFrom } = this.getRealPath(pathFrom);
        const { realPath: realPathTo } = this.getRealPath(pathTo);

        const rename = (overwritten) => {
            fs.rename(realPathFrom, realPathTo, (e) => {
                if(e)
                    return callback(e);

                this.resources[realPathTo] = this.resources[realPathFrom];
                delete this.resources[realPathFrom];
                callback(null, overwritten);
            });
        };

        fs.access(realPathTo, (e) => {
            if(e)
            { // destination doesn't exist
                rename(false);
            }
            else
            { // destination exists
                if(!ctx.overwrite)
                    return callback(webdav.Errors.ResourceAlreadyExists);

                this.delete(ctx.context, pathTo, (e) => {
                    if(e)
                        return callback(e);
                    rename(true);
                });
            }
        })
    }

    protected _size(path : webdav.Path, ctx : webdav.SizeInfo, callback : webdav.ReturnCallback<number>) : void
    {
        callback(null, 0);
    }

    /**
     * Get a property of an existing resource (object property, not WebDAV property). If the resource doesn't exist, it is created.
     *
     * @param path Path of the resource
     * @param ctx Context of the method
     * @param propertyName Name of the property to get from the resource
     * @param callback Callback returning the property object of the resource
     */
    protected getPropertyFromResource(path : webdav.Path, ctx : any, propertyName : string, callback : webdav.ReturnCallback<any>) : void
    {
        let resource = this.resources[path.toString()];
        if(!resource)
        {
            resource = new GalleryFileSystemResource();
            this.resources[path.toString()] = resource;
        }

        callback(null, resource[propertyName]);
    }

    protected _lockManager(path : webdav.Path, ctx : webdav.LockManagerInfo, callback : webdav.ReturnCallback<webdav.ILockManager>) : void
    {
        this.getPropertyFromResource(path, ctx, 'locks', callback);
    }

    protected _propertyManager(path : webdav.Path, ctx : webdav.PropertyManagerInfo, callback : webdav.ReturnCallback<webdav.IPropertyManager>) : void
    {
        this.getPropertyFromResource(path, ctx, 'props', callback);
    }

    protected _readDir(path : webdav.Path, ctx : webdav.ReadDirInfo, callback : webdav.ReturnCallback<string[] | webdav.Path[]>) : void
    {
        const { subPath } = this.getRealPath(path);
        BasicDB.Select('gfs__Containers', ['nameContainer'], ['pathContainer','?'], null, [ subPath ], function(err, rows, fields) {
            var items : string[] = [];
            if (!err) {
              rows.forEach(function(element) {
                items.push(element.nameContainer)
              });
            }
            callback(err ? webdav.Errors.ResourceNotFound : null, items);
        });
    }

    protected _creationDate(path : webdav.Path, ctx : webdav.CreationDateInfo, callback : webdav.ReturnCallback<number>) : void
    {
        callback(null, 0);
    }

    protected _lastModifiedDate(path : webdav.Path, ctx : webdav.LastModifiedDateInfo, callback : webdav.ReturnCallback<number>) : void
    {
        callback(null, 0);
    }

    protected _type(path : webdav.Path, ctx : webdav.TypeInfo, callback : webdav.ReturnCallback<webdav.ResourceType>) : void
    {
        return callback(null, webdav.ResourceType.Directory);
        const { realPath } = this.getRealPath(path);

        if(realPath.indexOf('.url') !== -1)
            return callback(webdav.Errors.ResourceNotFound);

        fs.stat(realPath, (e, stat) => {
            if(e)
                return callback(webdav.Errors.ResourceNotFound);

            callback(null, stat.isDirectory() ? webdav.ResourceType.Directory : webdav.ResourceType.File);
        })
    }
}