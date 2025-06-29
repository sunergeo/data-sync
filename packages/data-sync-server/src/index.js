"use strict";
/**
 * @sunergeo/data-sync-server
 *
 * Server SDK for data synchronization between frontend applications and a backend server.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAttachmentDownload = exports.handleAttachmentUpload = exports.handleSync = exports.authenticate = exports.SyncEngine = void 0;
// Export the SyncEngine class
var SyncEngine_1 = require("./SyncEngine");
Object.defineProperty(exports, "SyncEngine", { enumerable: true, get: function () { return SyncEngine_1.SyncEngine; } });
// Export middleware functions
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return middleware_1.authenticate; } });
Object.defineProperty(exports, "handleSync", { enumerable: true, get: function () { return middleware_1.handleSync; } });
Object.defineProperty(exports, "handleAttachmentUpload", { enumerable: true, get: function () { return middleware_1.handleAttachmentUpload; } });
Object.defineProperty(exports, "handleAttachmentDownload", { enumerable: true, get: function () { return middleware_1.handleAttachmentDownload; } });
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
