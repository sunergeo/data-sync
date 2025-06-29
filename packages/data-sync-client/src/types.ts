/**
 * Types for the data sync client
 */

/**
 * Options for initializing the SyncClient
 */
export interface SyncClientOptions {
    /** API key for authentication */
    apiKey: string
    /** Endpoint URL for the sync server */
    endpoint: string
    /** Unique identifier for the current device */
    deviceId: string
}

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
 * Payload sent to the server during sync
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
