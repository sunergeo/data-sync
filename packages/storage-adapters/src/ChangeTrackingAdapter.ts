import {Record, AttachmentMeta} from '@sunergeo/data-sync-server'
import {BaseAdapter} from './BaseAdapter'

/**
 * Change operation type
 */
type ChangeOperation = 'create' | 'update' | 'delete'

/**
 * Change tracking entry
 */
interface ChangeEntry {
    recordId: string
    deviceId: string
    timestamp: string
    operation: ChangeOperation
}

/**
 * In-memory storage adapter with a separate change tracking table
 *
 * Uses a separate table to track changes to records, allowing for more
 * efficient change detection and synchronization.
 */
export class ChangeTrackingAdapter extends BaseAdapter {
    private records: Map<string, Record> = new Map()
    private deletedRecords: Set<string> = new Set()
    private attachments: Map<string, {buffer: Buffer; metadata: AttachmentMeta}> = new Map()
    
    // Change tracking table
    private changeTable: ChangeEntry[] = []

    /**
     * Creates a new ChangeTrackingAdapter instance
     */
    constructor() {
        super()
    }

    async getAllRecords(): Promise<Record[]> {
        const records = [...this.records.values()]
        return records
    }

    /**
     * Get changes since a specific timestamp
     * @param timestamp Timestamp to get changes since
     * @param deviceId ID of the device requesting changes
     * @returns Records changed since the timestamp
     */
    async getChangesSince(timestamp: string, deviceId: string): Promise<Record[]> {
        // Parse the timestamp once
        const filterDate = new Date(timestamp)

        // Get record IDs that have changed since the timestamp
        // and don't include changes from the same device
        const changedRecordIds = this.changeTable
            .filter(entry => {
                const entryDate = new Date(entry.timestamp)
                return entryDate > filterDate && entry.deviceId !== deviceId
            })
            .map(entry => entry.recordId)
        
        // Remove duplicates (a record might have been changed multiple times)
        const uniqueRecordIds = [...new Set(changedRecordIds)]
        
        // Get the records
        const changedRecords = uniqueRecordIds
            .map(id => this.records.get(id))
            .filter(record => record !== undefined) as Record[]
        
        // Return records that haven't been deleted
        return changedRecords.filter(record => !this.deletedRecords.has(record.id))
    }

    /**
     * Apply records to storage with change tracking
     * @param records Records to apply
     * @param deviceId ID of the device applying the records
     */
    async applyRecords(records: Record[], deviceId: string): Promise<void> {
        for (const record of records) {
            const existingRecord = this.records.get(record.id)
            const operation: ChangeOperation = existingRecord ? 'update' : 'create'
            
            // Store the record
            this.records.set(record.id, record)
            
            // Track the change
            this.trackChange(record.id, deviceId, record.updatedAt, operation)
        }
    }

    /**
     * Store an attachment
     * @param file File buffer
     * @param metadata Metadata for the attachment
     * @returns ID of the stored attachment
     */
    async storeAttachment(file: Buffer, metadata: AttachmentMeta): Promise<string> {
        this.attachments.set(metadata.id, {
            buffer: file,
            metadata
        })
        return metadata.id
    }

    /**
     * Fetch an attachment
     * @param attachmentId ID of the attachment to fetch
     * @returns The attachment buffer
     */
    async fetchAttachment(attachmentId: string): Promise<Buffer> {
        const attachment = this.attachments.get(attachmentId)
        if (!attachment) {
            throw new Error(`Attachment not found: ${attachmentId}`)
        }
        return attachment.buffer
    }

    /**
     * Delete a record
     * @param recordId ID of the record to delete
     * @param deviceId ID of the device deleting the record
     */
    async deleteRecord(recordId: string, deviceId: string): Promise<void> {
        // Mark the record as deleted
        this.deletedRecords.add(recordId)

        // Remove from records map
        this.records.delete(recordId)

        // Track the change
        this.trackChange(recordId, deviceId, this.getCurrentTimestamp(), 'delete')
    }

    /**
     * Clear all data
     * Useful for testing
     */
    clear(): void {
        this.records.clear()
        this.deletedRecords.clear()
        this.attachments.clear()
        this.changeTable = []
    }

    /**
     * Track a change in the change table
     * @param recordId ID of the record that changed
     * @param deviceId ID of the device that made the change
     * @param timestamp Timestamp of the change
     * @param operation Type of change operation
     */
    private trackChange(
        recordId: string,
        deviceId: string,
        timestamp: string,
        operation: ChangeOperation
    ): void {
        this.changeTable.push({
            recordId,
            deviceId,
            timestamp,
            operation
        })
        
        // Optionally, we could implement pruning of the change table here
        // to remove old entries and prevent unbounded growth
        this.pruneChangeTable()
    }
    
    /**
     * Prune the change table to remove old entries
     * This prevents unbounded growth of the change table
     */
    private pruneChangeTable(): void {
        // Keep track of the latest change for each record
        const latestChanges = new Map<string, ChangeEntry>()
        
        // Process changes from newest to oldest
        const sortedChanges = [...this.changeTable].sort(
            (a, b) => this.compareTimestamps(b.timestamp, a.timestamp)
        )
        
        for (const change of sortedChanges) {
            // If we haven't seen this record yet, keep the change
            if (!latestChanges.has(change.recordId)) {
                latestChanges.set(change.recordId, change)
            }
        }
        
        // Keep only the latest change for each record, plus a buffer of recent changes
        // The buffer helps with conflict resolution and handling concurrent changes
        const bufferSize = 100 // Keep the 100 most recent changes
        const latestChangesList = Array.from(latestChanges.values())
        const recentChanges = sortedChanges.slice(0, bufferSize)
        
        // Combine the latest changes for each record with the recent changes buffer
        const changesToKeep = new Set([
            ...latestChangesList.map(change => JSON.stringify(change)),
            ...recentChanges.map(change => JSON.stringify(change))
        ])
        
        // Update the change table
        this.changeTable = Array.from(changesToKeep).map(changeStr => JSON.parse(changeStr))
    }
    
    /**
     * Get the change history for a specific record
     * Useful for debugging and conflict resolution
     * @param recordId ID of the record
     * @returns Change history for the record
     */
    getChangeHistory(recordId: string): ChangeEntry[] {
        return this.changeTable
            .filter(entry => entry.recordId === recordId)
            .sort((a, b) => this.compareTimestamps(a.timestamp, b.timestamp))
    }
    
    /**
     * Get records that have been modified by a specific device
     * @param deviceId ID of the device
     * @returns Records modified by the device
     */
    async getRecordsModifiedByDevice(deviceId: string): Promise<Record[]> {
        const recordIds = this.changeTable
            .filter(entry => entry.deviceId === deviceId)
            .map(entry => entry.recordId)
        
        const uniqueRecordIds = [...new Set(recordIds)]
        
        const records = uniqueRecordIds
            .map(id => this.records.get(id))
            .filter(record => record !== undefined) as Record[]
        
        return records.filter(record => !this.deletedRecords.has(record.id))
    }
    
    /**
     * Get records that have been modified since a specific timestamp
     * with pagination support for large datasets
     * @param timestamp Timestamp to get changes since
     * @param deviceId ID of the device requesting changes
     * @param limit Maximum number of records to return
     * @param offset Offset for pagination
     * @returns Records changed since the timestamp
     */
    async getChangesSincePaginated(
        timestamp: string,
        deviceId: string,
        limit: number = 100,
        offset: number = 0
    ): Promise<Record[]> {
        const allChanges = await this.getChangesSince(timestamp, deviceId)
        return allChanges.slice(offset, offset + limit)
    }
}