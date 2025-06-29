"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryAdapter = void 0;
const BaseAdapter_1 = require("./BaseAdapter");
/**
 * In-memory storage adapter
 *
 * Stores data in memory. Useful for testing and development.
 * Not suitable for production use as data is lost when the process restarts.
 */
class MemoryAdapter extends BaseAdapter_1.BaseAdapter {
    /**
     * Creates a new MemoryAdapter instance
     */
    constructor() {
        super();
        this.records = new Map();
        this.deletedRecords = new Set();
        this.attachments = new Map();
        this.changeLog = [];
    }
    async getAllRecords() {
        const records = [...this.records.values()];
        return records;
    }
    /**
     * Get changes since a specific timestamp
     * @param timestamp Timestamp to get changes since
     * @param deviceId ID of the device requesting changes
     * @returns Records changed since the timestamp
     */
    async getChangesSince(timestamp, deviceId) {
        // Get record IDs that have changed since the timestamp
        const changedIds = this.changeLog
            .filter((entry) => this.compareTimestamps(entry.timestamp, timestamp) > 0 && entry.deviceId !== deviceId)
            .map((entry) => entry.recordId);
        // Get unique record IDs
        const uniqueIds = [...new Set(changedIds)];
        // Get records for the IDs that haven't been deleted
        return uniqueIds
            .filter((id) => !this.deletedRecords.has(id))
            .map((id) => this.records.get(id))
            .filter((record) => record !== undefined);
    }
    /**
     * Apply records to storage
     * @param records Records to apply
     * @param deviceId ID of the device applying the records
     */
    async applyRecords(records, deviceId) {
        const timestamp = this.getCurrentTimestamp();
        for (const record of records) {
            // Store the record
            this.records.set(record.id, record);
            // Log the change
            this.changeLog.push({
                timestamp,
                recordId: record.id,
                deviceId
            });
        }
    }
    /**
     * Store an attachment
     * @param file File buffer
     * @param metadata Metadata for the attachment
     * @returns ID of the stored attachment
     */
    async storeAttachment(file, metadata) {
        this.attachments.set(metadata.id, {
            buffer: file,
            metadata
        });
        return metadata.id;
    }
    /**
     * Fetch an attachment
     * @param attachmentId ID of the attachment to fetch
     * @returns The attachment buffer
     */
    async fetchAttachment(attachmentId) {
        const attachment = this.attachments.get(attachmentId);
        if (!attachment) {
            throw new Error(`Attachment not found: ${attachmentId}`);
        }
        return attachment.buffer;
    }
    /**
     * Delete a record
     * @param recordId ID of the record to delete
     * @param deviceId ID of the device deleting the record
     */
    async deleteRecord(recordId, deviceId) {
        // Mark the record as deleted
        this.deletedRecords.add(recordId);
        // Remove from records map
        this.records.delete(recordId);
        // Log the change
        this.changeLog.push({
            timestamp: this.getCurrentTimestamp(),
            recordId,
            deviceId
        });
    }
    /**
     * Clear all data
     * Useful for testing
     */
    clear() {
        this.records.clear();
        this.deletedRecords.clear();
        this.attachments.clear();
        this.changeLog = [];
    }
}
exports.MemoryAdapter = MemoryAdapter;
