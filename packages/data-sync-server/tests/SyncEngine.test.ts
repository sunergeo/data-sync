import {describe, it, expect, vi, beforeEach} from 'vitest'
import {SyncEngine} from '../src/SyncEngine'
import {Record, SyncPayload, StorageAdapter, AttachmentMeta} from '../src/types'

// Mock storage adapter
const mockStorageAdapter: StorageAdapter = {
    getChangesSince: vi.fn(),
    applyRecords: vi.fn(),
    storeAttachment: vi.fn(),
    fetchAttachment: vi.fn(),
    getAllRecords: vi.fn()
}

describe('SyncEngine', () => {
    let syncEngine: SyncEngine

    beforeEach(() => {
        syncEngine = new SyncEngine({
            storageAdapter: mockStorageAdapter,
            validateApiKey: async (apiKey) => apiKey === 'valid-key'
        })
        vi.resetAllMocks()
    })

    it('should create a new instance with the provided options', () => {
        expect(syncEngine).toBeInstanceOf(SyncEngine)
    })

    it('should validate API keys correctly', async () => {
        expect(await syncEngine.isValidApiKey('valid-key')).toBe(true)
        expect(await syncEngine.isValidApiKey('invalid-key')).toBe(false)
    })

    it('should apply changes from a sync payload', async () => {
        const testRecords: Record[] = [
            {
                id: 'test-id-1',
                type: 'test-type',
                data: {test: 'data-1'},
                updatedAt: '2023-01-01T00:00:00.000Z'
            },
            {
                id: 'test-id-2',
                type: 'test-type',
                data: {test: 'data-2'},
                updatedAt: '2023-01-01T00:00:00.000Z'
            }
        ]

        const serverChanges: Record[] = [
            {
                id: 'server-id-1',
                type: 'test-type',
                data: {test: 'server-data-1'},
                updatedAt: '2023-01-01T00:00:00.000Z'
            }
        ]

        const payload: SyncPayload = {
            records: testRecords,
            deletedIds: [],
            attachments: [],
            deviceId: 'test-device',
            lastSyncAt: '2023-01-01T00:00:00.000Z'
        }

        // Mock storage adapter responses
        ;(mockStorageAdapter.getChangesSince as any).mockResolvedValue(serverChanges)
        ;(mockStorageAdapter.applyRecords as any).mockResolvedValue(undefined)

        const result = await syncEngine.applyChanges(payload)

        // Check that the storage adapter methods were called correctly
        expect(mockStorageAdapter.getChangesSince).toHaveBeenCalledWith(payload.lastSyncAt, payload.deviceId)
        expect(mockStorageAdapter.applyRecords).toHaveBeenCalledWith(
            expect.arrayContaining(testRecords),
            payload.deviceId
        )

        // Check the result
        expect(result.updatedRecords).toEqual(serverChanges)
        expect(result.syncTimestamp).toBeDefined()
    })

    it('should handle attachment storage and retrieval', async () => {
        const testBuffer = Buffer.from('test data')
        const testMetadata: AttachmentMeta = {
            id: 'test-attachment',
            recordId: 'test-record',
            mimeType: 'text/plain',
            size: testBuffer.length,
            filename: 'test.txt'
        }

        // Mock storage adapter responses
        ;(mockStorageAdapter.storeAttachment as any).mockResolvedValue(testMetadata.id)
        ;(mockStorageAdapter.fetchAttachment as any).mockResolvedValue(testBuffer)

        // Test storing an attachment
        const storedId = await syncEngine.storeAttachment(testBuffer, testMetadata)
        expect(storedId).toBe(testMetadata.id)
        expect(mockStorageAdapter.storeAttachment).toHaveBeenCalledWith(testBuffer, testMetadata)

        // Test fetching an attachment
        const fetchedBuffer = await syncEngine.fetchAttachment(testMetadata.id)
        expect(fetchedBuffer).toBe(testBuffer)
        expect(mockStorageAdapter.fetchAttachment).toHaveBeenCalledWith(testMetadata.id)
    })

    it('should resolve conflicts using the default strategy', async () => {
        const olderRecord: Record = {
            id: 'conflict-id',
            type: 'test-type',
            data: {test: 'older-data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        const newerRecord: Record = {
            id: 'conflict-id',
            type: 'test-type',
            data: {test: 'newer-data'},
            updatedAt: '2023-01-02T00:00:00.000Z'
        }

        const payload: SyncPayload = {
            records: [olderRecord],
            deletedIds: [],
            attachments: [],
            deviceId: 'test-device',
            lastSyncAt: '2023-01-01T00:00:00.000Z'
        }

        // Mock storage adapter to return a newer version of the record
        ;(mockStorageAdapter.getChangesSince as any).mockResolvedValue([newerRecord])
        ;(mockStorageAdapter.applyRecords as any).mockResolvedValue(undefined)

        const result = await syncEngine.applyChanges(payload)

        // The newer record should be in the result
        expect(result.updatedRecords).toContainEqual(newerRecord)
    })
})
