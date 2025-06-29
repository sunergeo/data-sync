/**
 * Types for the data sync server
 */

/**
 * Represents a data record to be synchronized
 */
export interface Record {
    /** Unique identifier for the record */
    id: string
    /** Type of the record */
    type: string
    /** Record data as JSON object */
    data: any
    /** Timestamp when the record was last updated */
    updatedAt: string
    /** Optional metadata for the record */
    meta?: {
        [key: string]: any
    }
}

/**
 * Metadata for an attachment
 */
export interface AttachmentMeta {
    /** Unique identifier for the attachment */
    id: string
    /** ID of the record this attachment belongs to */
    recordId: string
    /** MIME type of the attachment */
    mimeType: string
    /** Size of the attachment in bytes */
    size: number
    /** Filename of the attachment */
    filename: string
}

/**
 * Payload received from the client during sync
 */
export interface SyncPayload {
    /** Records to be synchronized */
    records: Record[]
    /** IDs of records that were deleted locally */
    deletedIds: string[]
    /** Metadata for attachments to be synchronized */
    attachments: AttachmentMeta[]
    /** Unique identifier for the current device */
    deviceId: string
    /** Timestamp of the last successful sync */
    lastSyncAt: string
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
    /** Records that were updated during sync */
    updatedRecords: Record[]
    /** Records that were deleted during sync */
    deletedIds: string[]
    /** Attachments that were updated during sync */
    updatedAttachments: AttachmentMeta[]
    /** Timestamp of the sync operation */
    syncTimestamp: string
    /** Any conflicts that occurred during sync */
    conflicts?: {
        recordId: string
        localVersion: Record
        remoteVersion: Record
    }[]
}

/**
 * Options for initializing the SyncEngine
 */
export interface SyncEngineOptions {
    /** Storage adapter to use */
    storageAdapter: StorageAdapter
    /** Function to validate API keys */
    validateApiKey?: (apiKey: string) => Promise<boolean>
    /** Function to resolve conflicts */
    resolveConflict?: (existing: Record, incoming: Record) => Record
}

/**
 * Interface for storage adapters
 */
export interface StorageAdapter {
    /** Get changes since a specific timestamp */
    getChangesSince(timestamp: string, deviceId: string): Promise<Record[]>
    /** Apply records to storage */
    applyRecords(records: Record[], deviceId: string): Promise<void>
    /** Store an attachment */
    storeAttachment(file: Buffer, metadata: AttachmentMeta): Promise<string>
    /** Fetch an attachment */
    fetchAttachment(attachmentId: string): Promise<Buffer>
}
