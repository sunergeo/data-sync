import {Record, AttachmentMeta} from '@sunergeo/data-sync-server'
import {BaseAdapter} from './BaseAdapter'

/**
 * In-memory storage adapter
 *
 * Stores data in memory. Useful for testing and development.
 * Not suitable for production use as data is lost when the process restarts.
 */
export class MemoryAdapter extends BaseAdapter {
    private records: Map<string, Record> = new Map()
    private deletedRecords: Set<string> = new Set()
    private attachments: Map<string, {buffer: Buffer; metadata: AttachmentMeta}> = new Map()
    private changeLog: {timestamp: string; recordId: string; deviceId: string}[] = []

    /**
     * Creates a new MemoryAdapter instance
     */
    constructor() {
        super()
    }

    /**
     * Get changes since a specific timestamp
     * @param timestamp Timestamp to get changes since
     * @param deviceId ID of the device requesting changes
     * @returns Records changed since the timestamp
     */
    async getChangesSince(timestamp: string, deviceId: string): Promise<Record[]> {
        // Get record IDs that have changed since the timestamp
        const changedIds = this.changeLog
            .filter((entry) => this.compareTimestamps(entry.timestamp, timestamp) > 0 && entry.deviceId !== deviceId)
            .map((entry) => entry.recordId)

        // Get unique record IDs
        const uniqueIds = [...new Set(changedIds)]

        // Get records for the IDs that haven't been deleted
        return uniqueIds
            .filter((id) => !this.deletedRecords.has(id))
            .map((id) => this.records.get(id))
            .filter((record): record is Record => record !== undefined)
    }

    /**
     * Apply records to storage
     * @param records Records to apply
     * @param deviceId ID of the device applying the records
     */
    async applyRecords(records: Record[], deviceId: string): Promise<void> {
        const timestamp = this.getCurrentTimestamp()

        for (const record of records) {
            // Store the record
            this.records.set(record.id, record)

            // Log the change
            this.changeLog.push({
                timestamp,
                recordId: record.id,
                deviceId
            })
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

        // Log the change
        this.changeLog.push({
            timestamp: this.getCurrentTimestamp(),
            recordId,
            deviceId
        })
    }

    /**
     * Clear all data
     * Useful for testing
     */
    clear(): void {
        this.records.clear()
        this.deletedRecords.clear()
        this.attachments.clear()
        this.changeLog = []
    }
}
