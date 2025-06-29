/**
 * @sunergeo/data-sync-storage-adapters
 *
 * Storage adapters for the data sync system.
 */

// Export the base adapter
export {BaseAdapter} from './BaseAdapter'

// Export the memory adapter
export {MemoryAdapter} from './MemoryAdapter'

// Export the MySQL adapter
export {MySQLAdapter, MySQLAdapterOptions} from './MySQLAdapter'

// Export the S3 adapter
export {S3Adapter, S3AdapterOptions} from './S3Adapter'

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
