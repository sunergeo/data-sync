"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLAdapter = void 0;
const BaseAdapter_1 = require("./BaseAdapter");
/**
 * MySQL storage adapter
 *
 * Stores data in a MySQL database.
 * Requires the mysql2 package to be installed.
 */
class MySQLAdapter extends BaseAdapter_1.BaseAdapter {
    /**
     * Creates a new MySQLAdapter instance
     * @param options Options for the adapter
     */
    constructor(options) {
        super();
        this.initialized = false;
        // Set default options
        this.options = {
            connectionOptions: options.connectionOptions,
            recordsTable: options.recordsTable || 'sync_records',
            attachmentsTable: options.attachmentsTable || 'sync_attachments',
            changesTable: options.changesTable || 'sync_changes',
            createTables: options.createTables !== false
        };
        // Import mysql2 dynamically
        try {
            // This will be replaced with the actual import at runtime
            const mysql = require('mysql2/promise');
            this.pool = mysql.createPool(this.options.connectionOptions);
        }
        catch (error) {
            throw new Error('mysql2 package is required for MySQLAdapter. Install it with: npm install mysql2');
        }
    }
    /**
     * Initialize the adapter
     * Creates tables if they don't exist
     */
    async initialize() {
        if (this.initialized)
            return;
        if (this.options.createTables) {
            await this.createTables();
        }
        this.initialized = true;
    }
    /**
     * Create the necessary tables
     */
    async createTables() {
        const connection = await this.pool.getConnection();
        try {
            // Create records table
            await connection.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.recordsTable} (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(255) NOT NULL,
          data JSON NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          meta JSON
        )
      `);
            // Create attachments table
            await connection.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.attachmentsTable} (
          id VARCHAR(255) PRIMARY KEY,
          record_id VARCHAR(255) NOT NULL,
          mime_type VARCHAR(255) NOT NULL,
          size INT NOT NULL,
          filename VARCHAR(255) NOT NULL,
          data LONGBLOB NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Create changes table
            await connection.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.changesTable} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          record_id VARCHAR(255) NOT NULL,
          device_id VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          INDEX (timestamp),
          INDEX (device_id)
        )
      `);
        }
        finally {
            connection.release();
        }
    }
    getAllRecords() {
        throw new Error('Method not implemented.');
    }
    /**
     * Get changes since a specific timestamp
     * @param timestamp Timestamp to get changes since
     * @param deviceId ID of the device requesting changes
     * @returns Records changed since the timestamp
     */
    async getChangesSince(timestamp, deviceId) {
        await this.initialize();
        const connection = await this.pool.getConnection();
        try {
            // Get record IDs that have changed since the timestamp
            const [rows] = await connection.query(`SELECT DISTINCT record_id FROM ${this.options.changesTable}
         WHERE timestamp > ? AND device_id != ?`, [timestamp, deviceId]);
            if (!Array.isArray(rows) || rows.length === 0) {
                return [];
            }
            // Get the record IDs
            const recordIds = rows.map((row) => row.record_id);
            // Get the records
            const [records] = await connection.query(`SELECT id, type, data, updated_at, meta FROM ${this.options.recordsTable}
         WHERE id IN (?)`, [recordIds]);
            if (!Array.isArray(records)) {
                return [];
            }
            // Convert to Record objects
            return records.map((row) => ({
                id: row.id,
                type: row.type,
                data: JSON.parse(row.data),
                updatedAt: new Date(row.updated_at).toISOString(),
                meta: row.meta ? JSON.parse(row.meta) : undefined
            }));
        }
        finally {
            connection.release();
        }
    }
    /**
     * Apply records to storage
     * @param records Records to apply
     * @param deviceId ID of the device applying the records
     */
    async applyRecords(records, deviceId) {
        if (records.length === 0)
            return;
        await this.initialize();
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            try {
                const timestamp = this.getCurrentTimestamp();
                // Insert or update records
                for (const record of records) {
                    await connection.query(`INSERT INTO ${this.options.recordsTable} (id, type, data, updated_at, meta)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             type = VALUES(type),
             data = VALUES(data),
             updated_at = VALUES(updated_at),
             meta = VALUES(meta)`, [
                        record.id,
                        record.type,
                        JSON.stringify(record.data),
                        record.updatedAt,
                        record.meta ? JSON.stringify(record.meta) : null
                    ]);
                    // Log the change
                    await connection.query(`INSERT INTO ${this.options.changesTable} (record_id, device_id, timestamp)
             VALUES (?, ?, ?)`, [record.id, deviceId, timestamp]);
                }
                await connection.commit();
            }
            catch (error) {
                await connection.rollback();
                throw error;
            }
        }
        finally {
            connection.release();
        }
    }
    /**
     * Store an attachment
     * @param file File buffer
     * @param metadata Metadata for the attachment
     * @returns ID of the stored attachment
     */
    async storeAttachment(file, metadata) {
        await this.initialize();
        const connection = await this.pool.getConnection();
        try {
            await connection.query(`INSERT INTO ${this.options.attachmentsTable} (id, record_id, mime_type, size, filename, data)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         record_id = VALUES(record_id),
         mime_type = VALUES(mime_type),
         size = VALUES(size),
         filename = VALUES(filename),
         data = VALUES(data)`, [metadata.id, metadata.recordId, metadata.mimeType, metadata.size, metadata.filename, file]);
            return metadata.id;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Fetch an attachment
     * @param attachmentId ID of the attachment to fetch
     * @returns The attachment buffer
     */
    async fetchAttachment(attachmentId) {
        await this.initialize();
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.query(`SELECT data FROM ${this.options.attachmentsTable} WHERE id = ?`, [
                attachmentId
            ]);
            if (!Array.isArray(rows) || rows.length === 0) {
                throw new Error(`Attachment not found: ${attachmentId}`);
            }
            return rows[0].data;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Close the connection pool
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}
exports.MySQLAdapter = MySQLAdapter;
