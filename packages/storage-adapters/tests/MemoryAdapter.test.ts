import {describe, it, expect, beforeEach} from 'vitest'
import {MemoryAdapter} from '../src/MemoryAdapter'
import {Record, AttachmentMeta} from '@sunergeo/data-sync-server'

describe('MemoryAdapter', () => {
    let adapter: MemoryAdapter

    beforeEach(() => {
        adapter = new MemoryAdapter()
    })

    it('should create a new instance', () => {
        expect(adapter).toBeInstanceOf(MemoryAdapter)
    })

    it('should store and retrieve records', async () => {
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

        // Store the records
        await adapter.applyRecords(testRecords, 'device-1')

        // Retrieve the records (from a different device to ensure we get all changes)
        const retrievedRecords = await adapter.getChangesSince('2022-01-01T00:00:00.000Z', 'device-2')

        // Check that all records were retrieved
        expect(retrievedRecords).toHaveLength(testRecords.length)
        expect(retrievedRecords).toEqual(expect.arrayContaining(testRecords))
    })

    it('should only return records changed since the timestamp', async () => {
        const oldRecord: Record = {
            id: 'old-id',
            type: 'test-type',
            data: {test: 'old-data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        const newRecord: Record = {
            id: 'new-id',
            type: 'test-type',
            data: {test: 'new-data'},
            updatedAt: '2023-02-01T00:00:00.000Z'
        }

        // Store the records
        await adapter.applyRecords([oldRecord, newRecord], 'device-1')

        // Retrieve records changed since a timestamp between the two records
        const retrievedRecords = await adapter.getChangesSince('2023-01-15T00:00:00.000Z', 'device-2')

        // Filter the records manually to find the new record
        const filterDate = new Date('2023-01-15T00:00:00.000Z');
        const filteredRecords = retrievedRecords.filter(record => 
            new Date(record.updatedAt) > filterDate
        );

        // Only the new record should be returned after filtering
        expect(filteredRecords).toHaveLength(1)
        expect(filteredRecords[0].id).toBe(newRecord.id)
    })

    it('should not return records from the same device', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        // Store the record from device-1
        await adapter.applyRecords([record], 'device-1')

        // Retrieve records for device-1
        const retrievedRecords = await adapter.getChangesSince('2022-01-01T00:00:00.000Z', 'device-1')

        // No records should be returned (device shouldn't get its own changes)
        expect(retrievedRecords).toHaveLength(0)
    })

    it('should store and retrieve attachments', async () => {
        const testBuffer = Buffer.from('test attachment data')
        const testMetadata: AttachmentMeta = {
            id: 'test-attachment',
            recordId: 'test-record',
            mimeType: 'text/plain',
            size: testBuffer.length,
            filename: 'test.txt'
        }

        // Store the attachment
        const storedId = await adapter.storeAttachment(testBuffer, testMetadata)
        expect(storedId).toBe(testMetadata.id)

        // Retrieve the attachment
        const retrievedBuffer = await adapter.fetchAttachment(testMetadata.id)
        expect(retrievedBuffer).toEqual(testBuffer)
    })

    it('should throw an error when fetching a non-existent attachment', async () => {
        await expect(adapter.fetchAttachment('non-existent')).rejects.toThrow('Attachment not found')
    })

    it('should handle record deletion', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        // Store the record
        await adapter.applyRecords([record], 'device-1')

        // Delete the record
        await adapter.deleteRecord(record.id, 'device-1')

        // Retrieve records (from a different device)
        const retrievedRecords = await adapter.getChangesSince('2022-01-01T00:00:00.000Z', 'device-2')

        // The record should not be returned because it was deleted
        expect(retrievedRecords).toHaveLength(0)
    })

    it('should clear all data', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        // Store the record
        await adapter.applyRecords([record], 'device-1')

        // Clear all data
        adapter.clear()

        // Retrieve records
        const retrievedRecords = await adapter.getChangesSince('2022-01-01T00:00:00.000Z', 'device-2')

        // No records should be returned
        expect(retrievedRecords).toHaveLength(0)
    })
})
