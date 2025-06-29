/**
 * Example server using the data sync packages
 */
import express from 'express'
import {
    SyncEngine,
    authenticate,
    handleSync,
    handleAttachmentUpload,
    handleAttachmentDownload
} from '@sunergeo/data-sync-server'
import {MemoryAdapter} from '@sunergeo/data-sync-storage-adapters'

// Create an Express app
const app = express()
app.use(express.json())

// Create a memory adapter for storage (for demonstration purposes)
const storageAdapter = new MemoryAdapter()

// Initialize the sync engine with the storage adapter
const syncEngine = new SyncEngine({
    storageAdapter,
    // Simple API key validation for demonstration
    validateApiKey: async (apiKey) => {
        return apiKey === 'demo-api-key'
    }
})

// Set up routes
app.post('/sync', authenticate(syncEngine), handleSync(syncEngine))
app.post('/attachments', authenticate(syncEngine), ...handleAttachmentUpload(syncEngine))
app.get('/attachments/:id', authenticate(syncEngine), handleAttachmentDownload(syncEngine))

// Add a simple status endpoint
app.get('/status', (req, res) => {
    res.json({status: 'ok', message: 'Sync server is running'})
})

// Start the server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Sync server running on port ${PORT}`)
    console.log('Available endpoints:')
    console.log('  POST /sync - Sync data')
    console.log('  POST /attachments - Upload attachments')
    console.log('  GET /attachments/:id - Download attachments')
    console.log('  GET /status - Check server status')
    console.log('\nUse API key "demo-api-key" for authentication')
})

/**
 * Example usage with curl:
 *
 * Check server status:
 * curl http://localhost:3000/status
 *
 * Sync data:
 * curl -X POST http://localhost:3000/sync \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer demo-api-key" \
 *   -d '{
 *     "records": [
 *       {
 *         "id": "record1",
 *         "type": "note",
 *         "data": { "title": "Test Note", "content": "Hello World" },
 *         "updatedAt": "2023-01-01T00:00:00.000Z"
 *       }
 *     ],
 *     "deletedIds": [],
 *     "attachments": [],
 *     "deviceId": "device1",
 *     "lastSyncAt": "2023-01-01T00:00:00.000Z"
 *   }'
 *
 * Upload attachment:
 * curl -X POST http://localhost:3000/attachments \
 *   -H "Authorization: Bearer demo-api-key" \
 *   -F "file=@/path/to/file.txt" \
 *   -F "attachmentId=record1-file.txt"
 *
 * Download attachment:
 * curl -X GET http://localhost:3000/attachments/record1-file.txt \
 *   -H "Authorization: Bearer demo-api-key" \
 *   --output downloaded-file.txt
 */
