import { Readable, Writable } from 'stream'
import { join as pathJoin } from 'path'
import { v2 as webdav } from 'webdav-server'
import * as fs from 'fs'

export class GaleryFileSystemResource
{
    props : webdav.LocalPropertyManager
    locks : webdav.LocalLockManager

    constructor(data ?: GaleryFileSystemResource)
    {
        if(!data)
        {
            this.props = new webdav.LocalPropertyManager();
            this.locks = new webdav.LocalLockManager();
        }
        else
        {
            const rs = data as GaleryFileSystemResource;
            this.props = new webdav.LocalPropertyManager(rs.props);
            this.locks = new webdav.LocalLockManager();
        }
    }
}

export class GalerySerializer implements webdav.FileSystemSerializer
{
    uid() : string
    {
        return 'GaleryFSSerializer-1.0.0';
    }

    serialize(fs : GaleryFileSystem, callback : webdav.ReturnCallback<any>) : void
    {
        callback(null, {
            resources: fs.resources,
            rootPath: fs.rootPath
        });
    }

    unserialize(serializedData : any, callback : webdav.ReturnCallback<webdav.FileSystem>) : void
    {
        // tslint:disable-next-line:no-use-before-declare
        const fs = new GaleryFileSystem(serializedData.rootPath);
        fs.resources = serializedData.resources;
        callback(null, fs);
    }
}

export const GalerySerializerVersions = {
    versions: {
        '1.0.0': GalerySerializer,
    },
    instances: [
        new GalerySerializer()
    ] as GalerySerializer[]
}

export class GaleryFileSystem extends webdav.FileSystem
{
    resources : {
        [path : string] : GaleryFileSystemResource
    }

    constructor(public rootPath : string)
    {
        super(new GalerySerializer());

        this.resources = {
            '/': new GaleryFileSystemResource()
        };
    }

    protected getRealPath(path : webdav.Path)
    {
        const sPath = path.toString();

        return {
            realPath: pathJoin(this.rootPath, sPath.substr(1)),
            resource: this.resources[sPath]
        };
    }

    protected _create(path : webdav.Path, ctx : webdav.CreateInfo, _callback : webdav.SimpleCallback) : void
    {
        const { realPath } = this.getRealPath(path);

        const callback = (e) => {
            if(!e)
                this.resources[path.toString()] = new GaleryFileSystemResource();
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
                this.resources[path.toString()] = new GaleryFileSystemResource();

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
        this.getStatProperty(path, ctx, 'size', callback);
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
            resource = new GaleryFileSystemResource();
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
        const { realPath } = this.getRealPath(path);

        fs.readdir(realPath, (e, files) => {
            callback(e ? webdav.Errors.ResourceNotFound : null, files);
        });
    }

    protected getStatProperty(path : webdav.Path, ctx : any, propertyName : string, callback : webdav.ReturnCallback<any>) : void
    {
        const { realPath } = this.getRealPath(path);

        fs.stat(realPath, (e, stat) => {
            if(e)
                return callback(webdav.Errors.ResourceNotFound);

            callback(null, stat[propertyName]);
        })
    }
    protected getStatDateProperty(path : webdav.Path, ctx : any, propertyName : string, callback : webdav.ReturnCallback<number>) : void
    {
        this.getStatProperty(path, ctx, propertyName, (e, value) => callback(e, value ? (value as Date).valueOf() : value));
    }

    protected _creationDate(path : webdav.Path, ctx : webdav.CreationDateInfo, callback : webdav.ReturnCallback<number>) : void
    {
        this.getStatDateProperty(path, ctx, 'birthtime', callback);
    }

    protected _lastModifiedDate(path : webdav.Path, ctx : webdav.LastModifiedDateInfo, callback : webdav.ReturnCallback<number>) : void
    {
        this.getStatDateProperty(path, ctx, 'mtime', callback);
    }

    protected _type(path : webdav.Path, ctx : webdav.TypeInfo, callback : webdav.ReturnCallback<webdav.ResourceType>) : void
    {
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