export const adapterHealthStates = Object.freeze({
  AVAILABLE: 'available',
  READY: 'ready',
  DISABLED: 'disabled',
  UNCONFIGURED: 'unconfigured',
  DEGRADED: 'degraded',
  PLANNED: 'planned',
  ERROR: 'error'
});

export const adapterErrorCodes = Object.freeze({
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  DISABLED: 'DISABLED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CONFLICT: 'CONFLICT',
  INVALID_PATH: 'INVALID_PATH',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  UNKNOWN: 'UNKNOWN'
});

export const storageCapabilities = Object.freeze({
  BROWSE: 'browse',
  SEARCH: 'search',
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
  DELETE: 'delete',
  CREATE_FOLDER: 'createFolder',
  RENAME: 'rename',
  MOVE: 'move',
  SHARE: 'share',
  TAGS: 'tags'
});

const userMessages = {
  [adapterErrorCodes.NOT_CONFIGURED]: 'This integration still needs connection settings before it can be used.',
  [adapterErrorCodes.DISABLED]: 'This integration is disabled in Settings.',
  [adapterErrorCodes.NOT_IMPLEMENTED]: 'This integration is registered but its adapter has not been implemented yet.',
  [adapterErrorCodes.NOT_FOUND]: 'The requested file or folder could not be found.',
  [adapterErrorCodes.PERMISSION_DENIED]: 'This account does not have access to that file or folder.',
  [adapterErrorCodes.CONFLICT]: 'A file or folder with that name already exists.',
  [adapterErrorCodes.INVALID_PATH]: 'That file path is not valid for this storage adapter.',
  [adapterErrorCodes.LIMIT_EXCEEDED]: 'The file operation is too large for the current adapter limits.',
  [adapterErrorCodes.UPSTREAM_UNAVAILABLE]: 'The connected service is currently unavailable.',
  [adapterErrorCodes.UNKNOWN]: 'Something went wrong while talking to this integration.'
};

export class AdapterError extends Error {
  constructor(code, message, details = {}) {
    super(message || userMessages[code] || userMessages[adapterErrorCodes.UNKNOWN]);
    this.name = 'AdapterError';
    this.code = code || adapterErrorCodes.UNKNOWN;
    this.details = details;
  }
}

export function adapterErrorResponse(error) {
  const code = error instanceof AdapterError ? error.code : adapterErrorCodes.UNKNOWN;
  return {
    code,
    message: error instanceof AdapterError && error.message
      ? error.message
      : userMessages[code] || userMessages[adapterErrorCodes.UNKNOWN],
    detail: error instanceof AdapterError ? error.message : undefined
  };
}

export function storageItemContract(overrides = {}) {
  return {
    adapterKey: '',
    id: '',
    type: 'file',
    name: '',
    path: '',
    parentPath: '',
    mimeType: null,
    size: null,
    modifiedAt: null,
    createdAt: null,
    canDownload: false,
    canDelete: false,
    canRename: false,
    canMove: false,
    metadata: {},
    ...overrides
  };
}

export function adapterDescriptor(setting, definition) {
  const isPlanned = definition.healthState === adapterHealthStates.PLANNED;
  const isEnabled = Boolean(setting?.isEnabled);
  const healthState = isPlanned
    ? adapterHealthStates.PLANNED
    : isEnabled
      ? definition.requiresConfig === false
        ? adapterHealthStates.READY
        : adapterHealthStates.UNCONFIGURED
      : adapterHealthStates.DISABLED;

  return {
    key: definition.key,
    label: definition.label,
    adapterType: definition.adapterType,
    description: definition.description,
    isEnabled,
    health: {
      state: healthState,
      message: healthMessage(healthState, definition.label)
    },
    capabilities: definition.capabilities,
    itemContract: definition.adapterType === 'storage' ? storageItemContract({ adapterKey: definition.key }) : null,
    configSchema: definition.configSchema,
    updatedAt: setting?.updatedAt || null
  };
}

function healthMessage(state, label) {
  if (state === adapterHealthStates.PLANNED) return `${label} is planned and not available yet.`;
  if (state === adapterHealthStates.DISABLED) return `${label} is registered but disabled.`;
  if (state === adapterHealthStates.UNCONFIGURED) return `${label} is enabled but needs connection settings.`;
  if (state === adapterHealthStates.READY) return `${label} is ready.`;
  if (state === adapterHealthStates.DEGRADED) return `${label} is available with warnings.`;
  if (state === adapterHealthStates.ERROR) return `${label} needs attention.`;
  return `${label} is available.`;
}

export const integrationAdapterDefinitions = [
  {
    key: 'local-storage',
    label: 'Local Storage',
    adapterType: 'storage',
    description: 'A Docker-mounted storage location for development and first deployment.',
    healthState: adapterHealthStates.AVAILABLE,
    requiresConfig: false,
    capabilities: [
      storageCapabilities.BROWSE,
      storageCapabilities.SEARCH,
      storageCapabilities.UPLOAD,
      storageCapabilities.DOWNLOAD,
      storageCapabilities.DELETE,
      storageCapabilities.CREATE_FOLDER
    ],
    configSchema: {
      rootPath: { type: 'string', required: false, label: 'Root path' },
      maxUploadMb: { type: 'number', required: false, label: 'Max upload size in MB' }
    }
  },
  {
    key: 'webdav',
    label: 'WebDAV',
    adapterType: 'storage',
    description: 'Standards-based file access for NAS or cloud-compatible storage.',
    healthState: adapterHealthStates.PLANNED,
    capabilities: [
      storageCapabilities.BROWSE,
      storageCapabilities.SEARCH,
      storageCapabilities.UPLOAD,
      storageCapabilities.DOWNLOAD,
      storageCapabilities.DELETE,
      storageCapabilities.CREATE_FOLDER,
      storageCapabilities.RENAME,
      storageCapabilities.MOVE
    ],
    configSchema: {
      endpoint: { type: 'url', required: true, label: 'WebDAV URL' },
      username: { type: 'string', required: true, label: 'Username' },
      password: { type: 'secret', required: true, label: 'Password' }
    }
  },
  {
    key: 'smb',
    label: 'SMB',
    adapterType: 'storage',
    description: 'Network share access for NAS platforms that expose SMB shares.',
    healthState: adapterHealthStates.PLANNED,
    capabilities: [
      storageCapabilities.BROWSE,
      storageCapabilities.DOWNLOAD
    ],
    configSchema: {
      host: { type: 'string', required: true, label: 'Host' },
      share: { type: 'string', required: true, label: 'Share name' }
    }
  },
  {
    key: 'docker',
    label: 'Docker',
    adapterType: 'service',
    description: 'Service status and container controls for later server portal work.',
    healthState: adapterHealthStates.PLANNED,
    capabilities: ['listServices', 'serviceHealth'],
    configSchema: {}
  },
  {
    key: 'ssh',
    label: 'SSH',
    adapterType: 'server',
    description: 'Allowlisted server status commands for later NAS integration.',
    healthState: adapterHealthStates.PLANNED,
    capabilities: ['serverHealth', 'allowlistedCommands'],
    configSchema: {}
  },
  {
    key: 'api',
    label: 'Generic API',
    adapterType: 'service',
    description: 'REST API adapter foundation for media, photos, and future services.',
    healthState: adapterHealthStates.PLANNED,
    capabilities: ['request', 'healthCheck'],
    configSchema: {}
  }
];
