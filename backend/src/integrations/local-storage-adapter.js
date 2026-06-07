import path from 'node:path';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import {
  AdapterError,
  adapterErrorCodes,
  storageCapabilities,
  storageItemContract
} from './adapter-contracts.js';

const textDecoder = new TextDecoder();

export class LocalStorageAdapter {
  constructor(rootPath) {
    this.key = 'local-storage';
    this.rootPath = path.resolve(rootPath);
  }

  async ensureRoot() {
    await mkdir(this.rootPath, { recursive: true });
  }

  async health() {
    await this.ensureRoot();
    return {
      state: 'ready',
      message: 'Local Storage is ready.',
      rootPath: this.rootPath
    };
  }

  capabilities() {
    return [
      storageCapabilities.BROWSE,
      storageCapabilities.SEARCH,
      storageCapabilities.UPLOAD,
      storageCapabilities.DOWNLOAD,
      storageCapabilities.DELETE,
      storageCapabilities.CREATE_FOLDER
    ];
  }

  async list(relativePath = '', query = '') {
    await this.ensureRoot();
    const directory = this.resolvePath(relativePath);
    const directoryStat = await this.safeStat(directory);

    if (!directoryStat || !directoryStat.isDirectory()) {
      throw new AdapterError(adapterErrorCodes.NOT_FOUND, 'Folder not found.');
    }

    const entries = query
      ? await this.search(query)
      : await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
          const fullPath = path.join(directory, entry.name);
          return this.itemFromPath(fullPath, entry);
        }));

    const folders = entries.filter((item) => item.type === 'folder').sort(sortItems);
    const files = entries.filter((item) => item.type === 'file').sort(sortItems);

    return {
      adapterKey: this.key,
      currentPath: this.normalizeRelativePath(relativePath),
      breadcrumb: this.breadcrumb(relativePath),
      folders,
      files,
      summary: {
        folders: folders.length,
        files: files.length,
        visibleSize: files.reduce((total, item) => total + (item.size || 0), 0),
        search: query || ''
      }
    };
  }

  async createFolder(relativePath, name) {
    const cleanName = safeName(name);
    if (!cleanName) {
      throw new AdapterError(adapterErrorCodes.INVALID_PATH, 'Folder name is required.');
    }

    const target = this.resolvePath(path.join(relativePath || '', cleanName));
    if (await this.safeStat(target)) {
      throw new AdapterError(adapterErrorCodes.CONFLICT, 'A file or folder with that name already exists.');
    }

    await mkdir(target, { recursive: false });
    return this.itemFromPath(target);
  }

  async upload(relativePath, file) {
    if (!file) {
      throw new AdapterError(adapterErrorCodes.NOT_FOUND, 'Upload file is missing.');
    }

    const cleanName = safeName(file.originalname);
    if (!cleanName) {
      throw new AdapterError(adapterErrorCodes.INVALID_PATH, 'File name is invalid.');
    }

    const target = this.resolvePath(path.join(relativePath || '', cleanName));
    if (await this.safeStat(target)) {
      throw new AdapterError(adapterErrorCodes.CONFLICT, 'A file with that name already exists.');
    }

    await writeFile(target, file.buffer);
    return this.itemFromPath(target);
  }

  async delete(relativePath) {
    const target = this.resolvePath(relativePath);
    if (target === this.rootPath) {
      throw new AdapterError(adapterErrorCodes.PERMISSION_DENIED, 'The storage root cannot be deleted.');
    }
    if (!(await this.safeStat(target))) {
      throw new AdapterError(adapterErrorCodes.NOT_FOUND, 'File or folder not found.');
    }

    await rm(target, { recursive: true, force: true });
  }

  async download(relativePath) {
    const target = this.resolvePath(relativePath);
    const itemStat = await this.safeStat(target);
    if (!itemStat || !itemStat.isFile()) {
      throw new AdapterError(adapterErrorCodes.NOT_FOUND, 'File not found.');
    }

    return {
      stream: createReadStream(target),
      name: path.basename(target),
      size: itemStat.size
    };
  }

  async search(query) {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) return [];

    const results = [];
    await this.walk(this.rootPath, async (fullPath, entry) => {
      if (entry.name.toLowerCase().includes(needle)) {
        results.push(await this.itemFromPath(fullPath, entry));
      }
    });
    return results;
  }

  async walk(directory, visit) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      await visit(fullPath, entry);
      if (entry.isDirectory()) {
        await this.walk(fullPath, visit);
      }
    }
  }

  resolvePath(relativePath = '') {
    const normalized = this.normalizeRelativePath(relativePath);
    const fullPath = path.resolve(this.rootPath, normalized);
    if (fullPath !== this.rootPath && !fullPath.startsWith(`${this.rootPath}${path.sep}`)) {
      throw new AdapterError(adapterErrorCodes.INVALID_PATH, 'Path is outside the storage root.');
    }
    return fullPath;
  }

  normalizeRelativePath(relativePath = '') {
    const raw = Array.isArray(relativePath) ? relativePath[0] : relativePath;
    return String(raw || '')
      .replaceAll('\\', '/')
      .split('/')
      .filter(Boolean)
      .join('/');
  }

  async safeStat(fullPath) {
    try {
      return await stat(fullPath);
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  breadcrumb(relativePath = '') {
    const parts = this.normalizeRelativePath(relativePath).split('/').filter(Boolean);
    const crumbs = [{ label: 'Root', path: '' }];
    parts.reduce((current, part) => {
      const next = current ? `${current}/${part}` : part;
      crumbs.push({ label: part, path: next });
      return next;
    }, '');
    return crumbs;
  }

  async itemFromPath(fullPath, entry = null) {
    const itemStat = await stat(fullPath);
    const type = entry?.isDirectory() || itemStat.isDirectory() ? 'folder' : 'file';
    const relativePath = path.relative(this.rootPath, fullPath).replaceAll(path.sep, '/');

    return storageItemContract({
      adapterKey: this.key,
      id: Buffer.from(relativePath).toString('base64url'),
      type,
      name: path.basename(fullPath),
      path: relativePath,
      parentPath: path.relative(this.rootPath, path.dirname(fullPath)).replaceAll(path.sep, '/'),
      size: type === 'file' ? itemStat.size : null,
      modifiedAt: itemStat.mtime,
      createdAt: itemStat.birthtime,
      canDownload: type === 'file',
      canDelete: true,
      canRename: false,
      canMove: false,
      metadata: {
        extension: type === 'file' ? path.extname(fullPath).slice(1).toLowerCase() : '',
        displayPath: relativePath || 'Root'
      }
    });
  }
}

function safeName(value) {
  return textDecoder.decode(new TextEncoder().encode(String(value || '').trim()))
    .replace(/[<>:"|?*\x00-\x1F]/g, '')
    .replaceAll('/', '')
    .replaceAll('\\', '')
    .slice(0, 160);
}

function sortItems(left, right) {
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}
