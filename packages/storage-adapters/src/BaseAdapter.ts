import {StorageAdapter, Record, AttachmentMeta} from '@sunergeo/data-sync-server'

/**
 * Abstract base class for storage adapters
 *
 * Provides common functionality and enforces the StorageAdapter interface
 */
export abstract class BaseAdapter implements StorageAdapter {
    /**
     * Retrieves all records from the data source ... primarily intended for development/testing
     *
     * @return {Promise<Record[]>} A promise that resolves to an array of records.
     */
    abstract getAllRecords(): Promise<Record[]>

    /**
     * Get changes since a specific timestamp
     * @param timestamp Timestamp to get changes since
     * @param deviceId ID of the device requesting changes
     */
    abstract getChangesSince(timestamp: string, deviceId: string): Promise<Record[]>

    /**
     * Apply records to storage
     * @param records Records to apply
     * @param deviceId ID of the device applying the records
     */
    abstract applyRecords(records: Record[], deviceId: string): Promise<void>

    /**
     * Store an attachment
     * @param file File buffer
     * @param metadata Metadata for the attachment
     */
    abstract storeAttachment(file: Buffer, metadata: AttachmentMeta): Promise<string>

    /**
     * Fetch an attachment
     * @param attachmentId ID of the attachment to fetch
     */
    abstract fetchAttachment(attachmentId: string): Promise<Buffer>

    /**
     * Helper method to convert a string timestamp to a Date object
     * @param timestamp Timestamp string
     * @returns Date object
     */
    protected parseTimestamp(timestamp: string): Date {
        return new Date(timestamp)
    }

    /**
     * Helper method to get the current timestamp as an ISO string
     * @returns Current timestamp
     */
    protected getCurrentTimestamp(): string {
        return new Date().toISOString()
    }

    /**
     * Helper method to compare two timestamps
     * @param a First timestamp
     * @param b Second timestamp
     * @returns -1 if a < b, 0 if a = b, 1 if a > b
     */
    protected compareTimestamps(a: string, b: string): number {
        const dateA = this.parseTimestamp(a)
        const dateB = this.parseTimestamp(b)
        return dateA < dateB ? -1 : dateA > dateB ? 1 : 0
    }
}
