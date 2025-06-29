import {describe, it, expect, vi, beforeEach} from 'vitest'
import {SyncClient} from '../src/SyncClient'
import {SyncClientOptions, Record, SyncResult} from '../src/types'

// Mock fetch
global.fetch = vi.fn()

// Mock FormData
global.FormData = vi.fn().mockImplementation(() => ({
    append: vi.fn()
}))

describe('SyncClient', () => {
    let client: SyncClient
    const options: SyncClientOptions = {
        apiKey: 'test-api-key',
        endpoint: 'https://example.com',
        deviceId: 'test-device'
    }

    beforeEach(() => {
        client = new SyncClient(options)
        vi.resetAllMocks()
    })

    it('should create a new instance with the provided options', () => {
        expect(client).toBeInstanceOf(SyncClient)
    })

    it('should queue a record for synchronization', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        await client.queueChange(record)

        // Perform sync to check if the record is included
        const mockResponse = {
            ok: true,
            json: () =>
                Promise.resolve({
                    updatedRecords: [],
                    deletedIds: [],
                    updatedAttachments: [],
                    syncTimestamp: '2023-01-01T00:00:00.000Z'
                } as SyncResult)
        }

        ;(global.fetch as any).mockResolvedValueOnce(mockResponse)

        await client.sync()

        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.com/sync',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer test-api-key'
                }),
                body: expect.stringContaining(record.id)
            })
        )
    })

    it('should attach a file to a record', async () => {
        const recordId = 'test-id'
        const file = new File(['test content'], 'test.txt', {type: 'text/plain'})

        await client.attachFile(recordId, file)

        // Perform sync to check if the attachment is included
        const mockResponse = {
            ok: true,
            json: () =>
                Promise.resolve({
                    updatedRecords: [],
                    deletedIds: [],
                    updatedAttachments: [],
                    syncTimestamp: '2023-01-01T00:00:00.000Z'
                } as SyncResult)
        }

        ;(global.fetch as any).mockResolvedValueOnce(mockResponse)
        ;(global.fetch as any).mockResolvedValueOnce({ok: true})

        await client.sync()

        // Check that the sync request includes the attachment metadata
        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.com/sync',
            expect.objectContaining({
                body: expect.stringContaining('attachments')
            })
        )

        // Check that the attachment upload request is made
        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.com/attachments',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-api-key'
                })
            })
        )
    })

    it('should handle sync errors', async () => {
        const mockResponse = {
            ok: false,
            statusText: 'Unauthorized'
        }

        ;(global.fetch as any).mockResolvedValueOnce(mockResponse)

        await expect(client.sync()).rejects.toThrow('Sync failed: Unauthorized')
    })
})
