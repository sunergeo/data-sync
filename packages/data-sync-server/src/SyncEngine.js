"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEngine = void 0;
/**
 * Engine for handling data synchronization on the server side
 */
class SyncEngine {
    /**
     * Creates a new SyncEngine instance
     * @param options Configuration options for the engine
     */
    constructor(options) {
        this.storageAdapter = options.storageAdapter;
        this.validateApiKey = options.validateApiKey ?? (async (apiKey) => true);
        this.resolveConflict = options.resolveConflict ?? this.defaultConflictResolver.bind(this);
    }
    /**
     * Applies changes from a client sync payload
     * @param payload The sync payload from the client
     * @returns Result of the sync operation
     */
    async applyChanges(payload) {
        // Get changes since the last sync
        const serverChanges = await this.storageAdapter.getChangesSince(payload.lastSyncAt, payload.deviceId);
        // Detect and resolve conflicts
        const { resolvedRecords, conflicts } = await this.resolveConflicts(payload.records, serverChanges);
        // Apply the resolved records to storage
        await this.storageAdapter.applyRecords(resolvedRecords, payload.deviceId);
        // Prepare the result
        const result = {
            updatedRecords: serverChanges,
            deletedIds: [],
            updatedAttachments: [],
            syncTimestamp: new Date().toISOString(),
            conflicts: conflicts.length > 0 ? conflicts : undefined
        };
        return result;
    }
    async fetchAllData() {
        const records = await this.storageAdapter.getAllRecords();
        return records;
    }
    /**
     * Resolves conflicts between client and server records
     * @param clientRecords Records from the client
     * @param serverRecords Records from the server
     * @returns Resolved records and any unresolved conflicts
     */
    async resolveConflicts(clientRecords, serverRecords) {
        const resolvedRecords = [];
        const conflicts = [];
        // Create a map of server records by ID for quick lookup
        const serverRecordsMap = new Map();
        for (const record of serverRecords) {
            serverRecordsMap.set(record.id, record);
        }
        // Process each client record
        for (const clientRecord of clientRecords) {
            const serverRecord = serverRecordsMap.get(clientRecord.id);
            // If no server record exists or it's older, use the client record
            if (!serverRecord) {
                resolvedRecords.push(clientRecord);
                continue;
            }
            // Check for conflict
            if (new Date(serverRecord.updatedAt) > new Date(clientRecord.updatedAt)) {
                // Server record is newer, potential conflict
                try {
                    // Try to resolve the conflict
                    // Using non-null assertion because resolveConflict is always defined in the constructor
                    const resolvedRecord = await this.resolveConflict(serverRecord, clientRecord);
                    resolvedRecords.push(resolvedRecord);
                }
                catch (error) {
                    // Conflict couldn't be resolved automatically
                    conflicts.push({
                        recordId: clientRecord.id,
                        localVersion: clientRecord,
                        remoteVersion: serverRecord
                    });
                }
            }
            else {
                // Client record is newer, use it
                resolvedRecords.push(clientRecord);
            }
        }
        return { resolvedRecords, conflicts };
    }
    /**
     * Default conflict resolution strategy (Last Write Wins)
     * @param existing Existing record
     * @param incoming Incoming record
     * @returns Resolved record
     */
    defaultConflictResolver(existing, incoming) {
        return new Date(incoming.updatedAt) > new Date(existing.updatedAt) ? incoming : existing;
    }
    /**
     * Validates an API key
     * @param apiKey The API key to validate
     * @returns Whether the API key is valid
     */
    async isValidApiKey(apiKey) {
        // Using non-null assertion because validateApiKey is always defined in the constructor
        return this.validateApiKey(apiKey);
    }
    /**
     * Stores an attachment
     * @param file The file buffer
     * @param metadata Metadata for the attachment
     * @returns ID of the stored attachment
     */
    async storeAttachment(file, metadata) {
        return this.storageAdapter.storeAttachment(file, metadata);
    }
    /**
     * Fetches an attachment
     * @param attachmentId ID of the attachment to fetch
     * @returns The attachment buffer
     */
    async fetchAttachment(attachmentId) {
        return this.storageAdapter.fetchAttachment(attachmentId);
    }
}
exports.SyncEngine = SyncEngine;
