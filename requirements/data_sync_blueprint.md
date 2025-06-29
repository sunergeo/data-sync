# Project Blueprint: Data Sync Package

## Overview

This blueprint describes the design and implementation plan for a TypeScript package that enables structured data and binary file synchronization between multiple front-end clients and a backend API server. The system supports API key-based authorization, multi-device usage, conflict resolution, and pluggable backend storage.

## System Architecture Diagram

```
+-----------------+      HTTPS/WebSocket     +------------------+
|  Frontend App   |<----------------------->|    Sync Server   |
| (Web/Mobile)    |                        | (Node.js API)     |
+--------+--------+                        +--------+----------+
         |                                          |
         |                                          v
         |                                  +---------------+
         |                                  | Storage Layer |
         |                                  | (Pluggable:   |
         |                                  | MySQL/S3/etc) |
         |                                  +---------------+
         |
         v
+--------------------------+
| Local DB (IndexedDB, etc)|
+--------------------------+
```

## Key Features

- API key authentication
- JSON + binary data sync
- Conflict resolution (LWW, manual merge)
- Sync checkpointing
- Pluggable storage adapters
- Device identification

---

## Modules

### 1. Frontend Client SDK (`@sunergeo/data-sync-client`)

**Responsibilities:**

- Local persistence
- Change tracking
- Sync initiation
- Attachment handling

#### Stub: Sync Client API

```ts
interface SyncClientOptions {
    apiKey: string
    endpoint: string
    deviceId: string
}

class SyncClient {
    constructor(options: SyncClientOptions)

    async sync(): Promise<SyncResult>
    async queueChange(record: Record): Promise<void>
    async attachFile(recordId: string, file: File): Promise<void>
}
```

---

### 2. Backend Sync API (`@sunergeo/data-sync-server`)

**Responsibilities:**

- Auth validation
- Change application
- Conflict detection
- Attachment upload/download

#### Stub: Express/Fastify Handler

```ts
interface SyncPayload {
    records: Record[]
    deletedIds: string[]
    attachments: AttachmentMeta[]
    deviceId: string
    lastSyncAt: string
}

app.post('/sync', authenticate, async (req, res) => {
    const payload: SyncPayload = req.body
    const result = await syncEngine.applyChanges(payload)
    res.json(result)
})
```

---

### 3. Storage Adapters

**Responsibilities:**

- Interface to backend storage
- Support for JSON records and binary blobs

#### Stub: Storage Interface

```ts
interface StorageAdapter {
    getChangesSince(timestamp: string, deviceId: string): Promise<Record[]>
    applyRecords(records: Record[], deviceId: string): Promise<void>
    storeAttachment(file: Buffer, metadata: AttachmentMeta): Promise<string>
    fetchAttachment(attachmentId: string): Promise<Buffer>
}
```

---

## Conflict Resolution Strategies

### Default: Last Write Wins

```ts
function resolveConflict(existing: Record, incoming: Record): Record {
    return new Date(incoming.updatedAt) > new Date(existing.updatedAt) ? incoming : existing
}
```

### Optional: Manual Merge Hook

```ts
function manualMerge(existing: Record, incoming: Record): MergedRecord {
    // Custom logic or user interaction required
}
```

---

## Sync Process Flow

1. Client queues local changes
2. Client calls `sync()` with local changes + lastSync timestamp
3. Server:
    - Authenticates request
    - Applies or queues changes
    - Resolves conflicts
    - Responds with updated records + conflict notices
4. Client updates local DB

---

## Package Configuration

Each package should include a `package.json` similar to:

```json
{
    "name": "@sunergeo/data-sync-client",
    "version": "0.1.0",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {
        "build": "tsup src/index.ts --format cjs,esm --dts",
        "test": "vitest"
    },
    "files": ["dist"],
    "author": "Sunergeo",
    "license": "MIT",
    "publishConfig": {
        "access": "public"
    }
}
```

> Note: `access: public` is required for publishing scoped packages to npm.

## Future Work

- End-to-end encryption
- Sync logs & dashboard
- Offline delta sync
- WebSocket real-time updates

---

## Testing Tools

- Jest/Vitest for unit tests
- Playwright for sync UI tests
- Postman for API tests
- Artillery for load simulation

---

## Monorepo Structure (pnpm/turbo)

```bash
/data-sync-monorepo
├── package.json
├── turbo.json (optional)
├── pnpm-workspace.yaml
└── packages/
    ├── data-sync-client/
    ├── data-sync-server/
    ├── storage-adapters/
    └── examples/
```
