/// <reference types="node" />
import { Readable, Writable } from 'stream';
import { v2 as webdav } from 'webdav-server';
export declare class GalleryFileSystemResource {
    props: webdav.LocalPropertyManager;
    locks: webdav.LocalLockManager;
    constructor(data?: GalleryFileSystemResource);
}
export declare class GallerySerializer implements webdav.FileSystemSerializer {
    uid(): string;
    serialize(fs: GalleryFileSystem, callback: webdav.ReturnCallback<any>): void;
    unserialize(serializedData: any, callback: webdav.ReturnCallback<webdav.FileSystem>): void;
}
export declare const GallerySerializerVersions: {
    versions: {
        '1.0.0': typeof GallerySerializer;
    };
    instances: GallerySerializer[];
};
export declare class GalleryFileSystem extends webdav.FileSystem {
    rootPath: string;
    resources: {
        [path: string]: GalleryFileSystemResource;
    };
    constructor(rootPath: string);
    protected getRealPath(path: webdav.Path): {
        realPath: string;
        subPath: string;
        resource: GalleryFileSystemResource;
    };
    protected _create(path: webdav.Path, ctx: webdav.CreateInfo, _callback: webdav.SimpleCallback): void;
    protected _delete(path: webdav.Path, ctx: webdav.DeleteInfo, _callback: webdav.SimpleCallback): void;
    protected _openWriteStream(path: webdav.Path, ctx: webdav.OpenWriteStreamInfo, callback: webdav.ReturnCallback<Writable>): void;
    protected _openReadStream(path: webdav.Path, ctx: webdav.OpenReadStreamInfo, callback: webdav.ReturnCallback<Readable>): void;
    protected _move(pathFrom: webdav.Path, pathTo: webdav.Path, ctx: webdav.MoveInfo, callback: webdav.ReturnCallback<boolean>): void;
    protected _size(path: webdav.Path, ctx: webdav.SizeInfo, callback: webdav.ReturnCallback<number>): void;
    /**
     * Get a property of an existing resource (object property, not WebDAV property). If the resource doesn't exist, it is created.
     *
     * @param path Path of the resource
     * @param ctx Context of the method
     * @param propertyName Name of the property to get from the resource
     * @param callback Callback returning the property object of the resource
     */
    protected getPropertyFromResource(path: webdav.Path, ctx: any, propertyName: string, callback: webdav.ReturnCallback<any>): void;
    protected _lockManager(path: webdav.Path, ctx: webdav.LockManagerInfo, callback: webdav.ReturnCallback<webdav.ILockManager>): void;
    protected _propertyManager(path: webdav.Path, ctx: webdav.PropertyManagerInfo, callback: webdav.ReturnCallback<webdav.IPropertyManager>): void;
    protected _readDir(path: webdav.Path, ctx: webdav.ReadDirInfo, callback: webdav.ReturnCallback<string[] | webdav.Path[]>): void;
    protected _creationDate(path: webdav.Path, ctx: webdav.CreationDateInfo, callback: webdav.ReturnCallback<number>): void;
    protected _lastModifiedDate(path: webdav.Path, ctx: webdav.LastModifiedDateInfo, callback: webdav.ReturnCallback<number>): void;
    protected _type(path: webdav.Path, ctx: webdav.TypeInfo, callback: webdav.ReturnCallback<webdav.ResourceType>): void;
}
