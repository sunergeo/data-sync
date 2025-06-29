/**
 * Example client using the data sync packages
 *
 * This is a simple command-line client that demonstrates how to use the client SDK.
 * In a real application, you would integrate this with your frontend framework.
 */
import {SyncClient, Record} from '@sunergeo/data-sync-client'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// Configuration
const API_KEY = 'demo-api-key'
const ENDPOINT = 'http://localhost:3000'
const DEVICE_ID = `device-${crypto.randomBytes(4).toString('hex')}`

// Create a sync client
const client = new SyncClient({
    apiKey: API_KEY,
    endpoint: ENDPOINT,
    deviceId: DEVICE_ID
})

// Sample data
const sampleRecords: Record[] = [
    {
        id: `note-${crypto.randomBytes(4).toString('hex')}`,
        type: 'note',
        data: {
            title: 'Shopping List',
            content: 'Milk, Eggs, Bread'
        },
        updatedAt: new Date().toISOString()
    },
    {
        id: `note-${crypto.randomBytes(4).toString('hex')}`,
        type: 'note',
        data: {
            title: 'Meeting Notes',
            content: 'Discuss project timeline and requirements',
            attendees: ['Alice', 'Bob', 'Charlie']
        },
        updatedAt: new Date().toISOString()
    }
]

// Create a temporary file for attachment testing
const createTempFile = () => {
    const tempDir = path.join(__dirname, 'temp')
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, {recursive: true})
    }

    const filePath = path.join(tempDir, 'test-attachment.txt')
    fs.writeFileSync(filePath, 'This is a test attachment file.')

    return filePath
}

// Main function to demonstrate the client
async function main() {
    try {
        console.log(`Starting sync client with device ID: ${DEVICE_ID}`)
        console.log(`Connecting to: ${ENDPOINT}`)

        // Queue some records for sync
        console.log('\nQueuing records for sync...')
        for (const record of sampleRecords) {
            await client.queueChange(record)
            console.log(`Queued record: ${record.id} (${record.data.title})`)
        }

        // Attach a file to the first record
        console.log('\nAttaching a file...')
        const filePath = createTempFile()
        const fileBuffer = fs.readFileSync(filePath)
        const file = new File([fileBuffer], 'test-attachment.txt', {type: 'text/plain'})
        await client.attachFile(sampleRecords[0].id, file)
        console.log(`Attached file to record: ${sampleRecords[0].id}`)

        // Perform the sync
        console.log('\nPerforming sync...')
        const result = await client.sync()

        // Display the results
        console.log('\nSync completed successfully!')
        console.log(`Sync timestamp: ${result.syncTimestamp}`)
        console.log(`Updated records: ${result.updatedRecords.length}`)
        console.log(`Deleted records: ${result.deletedIds.length}`)
        console.log(`Updated attachments: ${result.updatedAttachments.length}`)

        if (result.conflicts && result.conflicts.length > 0) {
            console.log(`\nConflicts detected: ${result.conflicts.length}`)
            for (const conflict of result.conflicts) {
                console.log(`Conflict on record: ${conflict.recordId}`)
            }
        }

        // Clean up
        fs.unlinkSync(filePath)
        console.log('\nCleanup completed.')
    } catch (error) {
        console.error('Error during sync:', error)
    }
}

// Run the main function
main().catch(console.error)

/**
 * Note: This example assumes the server is running at http://localhost:3001.
 * Start the server first with:
 *
 * ```
 * PORT=3001 npm run start:server
 * ```
 *
 * Then run this client with:
 *
 * ```
 * npm run start:client
 * ```
 */
