import {Record, AttachmentMeta} from '@sunergeo/data-sync-server'
import {BaseAdapter} from './BaseAdapter'

/**
 * Version vector for tracking record versions across devices
 */
interface VersionVector {
    [deviceId: string]: number
}

/**
 * Versioned record with version vector for conflict detection
 */
interface VersionedRecord extends Record {
    meta: {
        versionVector: VersionVector
        [key: string]: any
    }
}

/**
 * In-memory storage adapter with version vectors for better conflict resolution
 *
 * Uses version vectors (also known as vector clocks) to track record versions
 * across multiple devices, allowing for more accurate conflict detection.
 */
export class VersionedMemoryAdapter extends BaseAdapter {
    private records: Map<string, VersionedRecord> = new Map()
    private deletedRecords: Set<string> = new Set()
    private attachments: Map<string, {buffer: Buffer; metadata: AttachmentMeta}> = new Map()
    private changeLog: {timestamp: string; recordId: string; deviceId: string}[] = []

    /**
     * Creates a new VersionedMemoryAdapter instance
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

        // Get records that have changed since the timestamp
        const records = [...this.records.values()].filter(record => {
            // Parse the record's updatedAt timestamp
            const recordDate = new Date(record.updatedAt)

            // Filter by timestamp (only include records updated after the given timestamp)
            // and don't include records from the same device
            return recordDate > filterDate && 
                !this.changeLog.some(entry => 
                    entry.recordId === record.id && 
                    entry.deviceId === deviceId
                )
        })

        // Return records that haven't been deleted
        return records.filter(record => !this.deletedRecords.has(record.id))
    }

    /**
     * Apply records to storage with version vector tracking
     * @param records Records to apply
     * @param deviceId ID of the device applying the records
     */
    async applyRecords(records: Record[], deviceId: string): Promise<void> {
        for (const record of records) {
            // Get the existing record if it exists
            const existingRecord = this.records.get(record.id) as VersionedRecord | undefined

            // Create or update the version vector
            const versionVector: VersionVector = existingRecord?.meta?.versionVector || {}

            // Increment the version for this device
            versionVector[deviceId] = (versionVector[deviceId] || 0) + 1

            // Create a versioned record
            const versionedRecord: VersionedRecord = {
                ...record,
                meta: {
                    ...record.meta,
                    versionVector
                }
            }

            // Check for conflicts using version vectors
            if (existingRecord && this.hasConflict(existingRecord, versionedRecord)) {
                // Resolve the conflict using the version vectors
                const resolvedRecord = this.resolveConflict(existingRecord, versionedRecord)
                this.records.set(record.id, resolvedRecord)
            } else {
                // No conflict, just store the record
                this.records.set(record.id, versionedRecord)
            }

            // Log the change using the record's updatedAt timestamp
            this.changeLog.push({
                timestamp: record.updatedAt,
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

    /**
     * Check if two records have a conflict based on their version vectors
     * @param record1 First record
     * @param record2 Second record
     * @returns Whether the records have a conflict
     */
    private hasConflict(record1: VersionedRecord, record2: VersionedRecord): boolean {
        const vector1 = record1.meta.versionVector
        const vector2 = record2.meta.versionVector

        // Check if either vector is a successor of the other
        const isRecord1Successor = this.isSuccessor(vector1, vector2)
        const isRecord2Successor = this.isSuccessor(vector2, vector1)

        // If neither is a successor of the other, they are concurrent (conflict)
        return !isRecord1Successor && !isRecord2Successor
    }

    /**
     * Check if vector1 is a successor of vector2
     * @param vector1 First version vector
     * @param vector2 Second version vector
     * @returns Whether vector1 is a successor of vector2
     */
    private isSuccessor(vector1: VersionVector, vector2: VersionVector): boolean {
        // Check if vector1 is greater than or equal to vector2 for all devices
        let isGreaterInAtLeastOne = false

        // Check all devices in vector2
        for (const deviceId in vector2) {
            const v1Value = vector1[deviceId] || 0
            const v2Value = vector2[deviceId]

            // If vector1 has a smaller value for any device, it's not a successor
            if (v1Value < v2Value) {
                return false
            }

            // Check if vector1 is greater in at least one dimension
            if (v1Value > v2Value) {
                isGreaterInAtLeastOne = true
            }
        }

        // Check for any devices in vector1 that aren't in vector2
        for (const deviceId in vector1) {
            if (!(deviceId in vector2) && vector1[deviceId] > 0) {
                isGreaterInAtLeastOne = true
            }
        }

        // vector1 is a successor if it's >= vector2 in all dimensions and > in at least one
        return isGreaterInAtLeastOne
    }

    /**
     * Resolve a conflict between two records using their version vectors
     * @param record1 First record
     * @param record2 Second record
     * @returns Resolved record
     */
    private resolveConflict(record1: VersionedRecord, record2: VersionedRecord): VersionedRecord {
        // If either record is undefined, return the other record
        if (!record1) return record2;
        if (!record2) return record1;

        // Ensure both records have updatedAt timestamps
        const record1Date = record1.updatedAt ? new Date(record1.updatedAt) : new Date(0);
        const record2Date = record2.updatedAt ? new Date(record2.updatedAt) : new Date(0);

        // Default strategy: use the record with the later timestamp
        const useRecord1 = record1Date >= record2Date;

        // Merge the version vectors
        const mergedVector: VersionVector = {...record1.meta.versionVector}

        // Take the maximum version for each device
        for (const deviceId in record2.meta.versionVector) {
            mergedVector[deviceId] = Math.max(
                mergedVector[deviceId] || 0,
                record2.meta.versionVector[deviceId]
            )
        }

        // Create the resolved record
        const resolvedRecord: VersionedRecord = {
            ...(useRecord1 ? record1 : record2),
            meta: {
                ...(useRecord1 ? record1.meta : record2.meta),
                versionVector: mergedVector
            }
        }

        return resolvedRecord
    }
}
