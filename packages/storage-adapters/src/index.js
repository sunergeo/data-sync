"use strict";
/**
 * @sunergeo/data-sync-storage-adapters
 *
 * Storage adapters for the data sync system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Adapter = exports.MySQLAdapter = exports.MemoryAdapter = exports.BaseAdapter = void 0;
// Export the base adapter
var BaseAdapter_1 = require("./BaseAdapter");
Object.defineProperty(exports, "BaseAdapter", { enumerable: true, get: function () { return BaseAdapter_1.BaseAdapter; } });
// Export the memory adapter
var MemoryAdapter_1 = require("./MemoryAdapter");
Object.defineProperty(exports, "MemoryAdapter", { enumerable: true, get: function () { return MemoryAdapter_1.MemoryAdapter; } });
// Export the MySQL adapter
var MySQLAdapter_1 = require("./MySQLAdapter");
Object.defineProperty(exports, "MySQLAdapter", { enumerable: true, get: function () { return MySQLAdapter_1.MySQLAdapter; } });
// Export the S3 adapter
var S3Adapter_1 = require("./S3Adapter");
Object.defineProperty(exports, "S3Adapter", { enumerable: true, get: function () { return S3Adapter_1.S3Adapter; } });
/**
 * Example usage:
 *
 * ```ts
 * // Memory adapter (for testing)
 * import { MemoryAdapter } from '@sunergeo/data-sync-storage-adapters';
 * const memoryAdapter = new MemoryAdapter();
 *
 * // MySQL adapter
 * import { MySQLAdapter } from '@sunergeo/data-sync-storage-adapters';
 * import mysql from 'mysql2/promise';
 *
 * const mysqlAdapter = new MySQLAdapter({
 *   connectionOptions: {
 *     host: 'localhost',
 *     user: 'root',
 *     password: 'password',
 *     database: 'sync_db'
 *   }
 * });
 *
 * // S3 adapter (with MySQL for records)
 * import { S3Adapter, MySQLAdapter } from '@sunergeo/data-sync-storage-adapters';
 * import { S3 } from 'aws-sdk';
 *
 * const s3Client = new S3({
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: 'YOUR_ACCESS_KEY',
 *     secretAccessKey: 'YOUR_SECRET_KEY'
 *   }
 * });
 *
 * const mysqlAdapter = new MySQLAdapter({
 *   connectionOptions: {
 *     host: 'localhost',
 *     user: 'root',
 *     password: 'password',
 *     database: 'sync_db'
 *   }
 * });
 *
 * const s3Adapter = new S3Adapter({
 *   s3Client,
 *   attachmentsBucket: 'my-attachments-bucket',
 *   recordsAdapter: mysqlAdapter
 * });
 * ```
 */
