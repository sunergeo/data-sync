/**
 * @sunergeo/data-sync-server
 *
 * Server SDK for data synchronization between frontend applications and a backend server.
 */

// Export the SyncEngine class
export {SyncEngine} from './SyncEngine'

// Export middleware functions
export {authenticate, handleSync, handleAttachmentUpload, handleAttachmentDownload} from './middleware'

// Export types
export {Record, AttachmentMeta, SyncPayload, SyncResult, SyncEngineOptions, StorageAdapter} from './types'

/**
 * Example usage with Express:
 *
 * ```ts
 * import express from 'express';
 * import {
 *   SyncEngine,
 *   authenticate,
 *   handleSync,
 *   handleAttachmentUpload,
 *   handleAttachmentDownload
 * } from '@sunergeo/data-sync-server';
 * import { MySQLStorageAdapter } from './adapters/mysql';
 *
 * const app = express();
 * app.use(express.json());
 *
 * // Initialize the sync engine with a storage adapter
 * const syncEngine = new SyncEngine({
 *   storageAdapter: new MySQLStorageAdapter({
 *     // MySQL connection options
 *   }),
 *   validateApiKey: async (apiKey) => {
 *     // Custom API key validation logic
 *     return true;
 *   }
 * });
 *
 * // Set up routes
 * app.post('/sync', authenticate(syncEngine), handleSync(syncEngine));
 * app.post('/attachments', authenticate(syncEngine), ...handleAttachmentUpload(syncEngine));
 * app.get('/attachments/:id', authenticate(syncEngine), handleAttachmentDownload(syncEngine));
 *
 * app.listen(3000, () => {
 *   console.log('Sync server running on port 3000');
 * });
 * ```
 */
