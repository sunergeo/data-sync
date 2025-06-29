import {Record, SyncPayload, SyncResult, SyncEngineOptions, AttachmentMeta} from './types'

/**
 * Engine for handling data synchronization on the server side
 */
export class SyncEngine {
    private storageAdapter: SyncEngineOptions['storageAdapter']
    private validateApiKey: SyncEngineOptions['validateApiKey']
    private resolveConflict: SyncEngineOptions['resolveConflict']

    /**
     * Creates a new SyncEngine instance
     * @param options Configuration options for the engine
     */
    constructor(options: SyncEngineOptions) {
        this.storageAdapter = options.storageAdapter
        this.validateApiKey = options.validateApiKey ?? (async (apiKey: string) => true)
        this.resolveConflict = options.resolveConflict ?? this.defaultConflictResolver.bind(this)
    }

    /**
     * Applies changes from a client sync payload
     * @param payload The sync payload from the client
     * @returns Result of the sync operation
     */
    async applyChanges(payload: SyncPayload): Promise<SyncResult> {
        // Get changes since the last sync
        const serverChanges = await this.storageAdapter.getChangesSince(payload.lastSyncAt, payload.deviceId)

        // Detect and resolve conflicts
        const {resolvedRecords, conflicts} = await this.resolveConflicts(payload.records, serverChanges)

        // Apply the resolved records to storage
        await this.storageAdapter.applyRecords(resolvedRecords, payload.deviceId)

        // Prepare the result
        const result: SyncResult = {
            updatedRecords: serverChanges,
            deletedIds: [], // TODO: Implement deletion tracking
            updatedAttachments: [], // Will be populated when attachments are processed
            syncTimestamp: new Date().toISOString(),
            conflicts: conflicts.length > 0 ? conflicts : undefined
        }

        return result
    }

    /**
     * Resolves conflicts between client and server records
     * @param clientRecords Records from the client
     * @param serverRecords Records from the server
     * @returns Resolved records and any unresolved conflicts
     */
    private async resolveConflicts(
        clientRecords: Record[],
        serverRecords: Record[]
    ): Promise<{
        resolvedRecords: Record[]
        conflicts: {recordId: string; localVersion: Record; remoteVersion: Record}[]
    }> {
        const resolvedRecords: Record[] = []
        const conflicts: {recordId: string; localVersion: Record; remoteVersion: Record}[] = []

        // Create a map of server records by ID for quick lookup
        const serverRecordsMap = new Map<string, Record>()
        for (const record of serverRecords) {
            serverRecordsMap.set(record.id, record)
        }

        // Process each client record
        for (const clientRecord of clientRecords) {
            const serverRecord = serverRecordsMap.get(clientRecord.id)

            // If no server record exists or it's older, use the client record
            if (!serverRecord) {
                resolvedRecords.push(clientRecord)
                continue
            }

            // Check for conflict
            if (new Date(serverRecord.updatedAt) > new Date(clientRecord.updatedAt)) {
                // Server record is newer, potential conflict
                try {
                    // Try to resolve the conflict
                    // Using non-null assertion because resolveConflict is always defined in the constructor
                    const resolvedRecord = await this.resolveConflict!(serverRecord, clientRecord)
                    resolvedRecords.push(resolvedRecord)
                } catch (error) {
                    // Conflict couldn't be resolved automatically
                    conflicts.push({
                        recordId: clientRecord.id,
                        localVersion: clientRecord,
                        remoteVersion: serverRecord
                    })
                }
            } else {
                // Client record is newer, use it
                resolvedRecords.push(clientRecord)
            }
        }

        return {resolvedRecords, conflicts}
    }

    /**
     * Default conflict resolution strategy (Last Write Wins)
     * @param existing Existing record
     * @param incoming Incoming record
     * @returns Resolved record
     */
    private defaultConflictResolver(existing: Record, incoming: Record): Record {
        return new Date(incoming.updatedAt) > new Date(existing.updatedAt) ? incoming : existing
    }

    /**
     * Validates an API key
     * @param apiKey The API key to validate
     * @returns Whether the API key is valid
     */
    async isValidApiKey(apiKey: string): Promise<boolean> {
        // Using non-null assertion because validateApiKey is always defined in the constructor
        return this.validateApiKey!(apiKey)
    }

    /**
     * Stores an attachment
     * @param file The file buffer
     * @param metadata Metadata for the attachment
     * @returns ID of the stored attachment
     */
    async storeAttachment(file: Buffer, metadata: AttachmentMeta): Promise<string> {
        return this.storageAdapter.storeAttachment(file, metadata)
    }

    /**
     * Fetches an attachment
     * @param attachmentId ID of the attachment to fetch
     * @returns The attachment buffer
     */
    async fetchAttachment(attachmentId: string): Promise<Buffer> {
        return this.storageAdapter.fetchAttachment(attachmentId)
    }
}
