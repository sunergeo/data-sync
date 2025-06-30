import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {ChangeTrackingAdapter} from '../src/ChangeTrackingAdapter'
import {Record} from '@sunergeo/data-sync-server'

describe('ChangeTrackingAdapter', () => {
    let adapter: ChangeTrackingAdapter

    beforeEach(() => {
        adapter = new ChangeTrackingAdapter()
    })

    afterEach(() => {
        adapter.clear()
    })

    it('should store and retrieve records', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        await adapter.applyRecords([record], 'device-1')
        const records = await adapter.getAllRecords()

        expect(records.length).toBe(1)
        expect(records[0].id).toBe('test-id')
        expect(records[0].data.test).toBe('data')
    })

    it('should track changes in the change table', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        await adapter.applyRecords([record], 'device-1')
        
        // Get the change history for the record
        const history = adapter.getChangeHistory('test-id')
        
        expect(history.length).toBe(1)
        expect(history[0].recordId).toBe('test-id')
        expect(history[0].deviceId).toBe('device-1')
        expect(history[0].operation).toBe('create')
    })

    it('should track updates to records', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        // Initial create
        await adapter.applyRecords([record], 'device-1')
        
        // Update the record
        const updatedRecord: Record = {
            ...record,
            data: {test: 'updated-data'},
            updatedAt: '2023-01-02T00:00:00.000Z'
        }
        await adapter.applyRecords([updatedRecord], 'device-1')
        
        // Get the change history for the record
        const history = adapter.getChangeHistory('test-id')
        
        expect(history.length).toBe(2)
        expect(history[0].operation).toBe('create')
        expect(history[1].operation).toBe('update')
    })

    it('should track record deletions', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        // Create the record
        await adapter.applyRecords([record], 'device-1')
        
        // Delete the record
        await adapter.deleteRecord('test-id', 'device-1')
        
        // Get the change history for the record
        const history = adapter.getChangeHistory('test-id')
        
        expect(history.length).toBe(2)
        expect(history[0].operation).toBe('create')
        expect(history[1].operation).toBe('delete')
        
        // The record should no longer be in the store
        const records = await adapter.getAllRecords()
        expect(records.length).toBe(0)
    })

    it('should get changes since a specific timestamp', async () => {
        // Create initial records
        const initialRecords: Record[] = [
            {
                id: 'record-1',
                type: 'test-type',
                data: {value: 1},
                updatedAt: '2023-01-01T00:00:00.000Z'
            },
            {
                id: 'record-2',
                type: 'test-type',
                data: {value: 2},
                updatedAt: '2023-01-01T00:00:00.000Z'
            }
        ]
        
        await adapter.applyRecords(initialRecords, 'device-1')
        
        // Update one record after a timestamp
        const timestamp = '2023-01-02T00:00:00.000Z'
        
        const updatedRecord: Record = {
            id: 'record-1',
            type: 'test-type',
            data: {value: 3},
            updatedAt: '2023-01-03T00:00:00.000Z'
        }
        
        await adapter.applyRecords([updatedRecord], 'device-2')
        
        // Get changes since the timestamp
        const changes = await adapter.getChangesSince(timestamp, 'device-3')
        
        // Only the updated record should be returned
        expect(changes.length).toBe(1)
        expect(changes[0].id).toBe('record-1')
        expect(changes[0].data.value).toBe(3)
    })

    it('should not return changes made by the requesting device', async () => {
        // Create initial records
        const initialRecords: Record[] = [
            {
                id: 'record-1',
                type: 'test-type',
                data: {value: 1},
                updatedAt: '2023-01-01T00:00:00.000Z'
            }
        ]
        
        await adapter.applyRecords(initialRecords, 'device-1')
        
        // Update the record from the same device
        const updatedRecord: Record = {
            id: 'record-1',
            type: 'test-type',
            data: {value: 2},
            updatedAt: '2023-01-02T00:00:00.000Z'
        }
        
        await adapter.applyRecords([updatedRecord], 'device-1')
        
        // Get changes since the initial timestamp
        const changes = await adapter.getChangesSince('2023-01-01T00:00:00.000Z', 'device-1')
        
        // No changes should be returned since they were made by the requesting device
        expect(changes.length).toBe(0)
    })

    it('should get records modified by a specific device', async () => {
        // Create records from different devices
        const device1Record: Record = {
            id: 'record-1',
            type: 'test-type',
            data: {value: 1},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }
        
        const device2Record: Record = {
            id: 'record-2',
            type: 'test-type',
            data: {value: 2},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }
        
        await adapter.applyRecords([device1Record], 'device-1')
        await adapter.applyRecords([device2Record], 'device-2')
        
        // Get records modified by device-1
        const device1Records = await adapter.getRecordsModifiedByDevice('device-1')
        
        expect(device1Records.length).toBe(1)
        expect(device1Records[0].id).toBe('record-1')
    })

    it('should handle pagination for large datasets', async () => {
        // Create a large dataset (100 records)
        const largeDataset: Record[] = []
        for (let i = 0; i < 100; i++) {
            largeDataset.push({
                id: `record-${i}`,
                type: 'test-type',
                data: {value: i},
                updatedAt: '2023-01-01T00:00:00.000Z'
            })
        }
        
        await adapter.applyRecords(largeDataset, 'device-1')
        
        // Get the first page (10 records)
        const page1 = await adapter.getChangesSincePaginated(
            '2022-01-01T00:00:00.000Z',
            'device-2',
            10,
            0
        )
        
        expect(page1.length).toBe(10)
        expect(page1[0].id).toBe('record-0')
        expect(page1[9].id).toBe('record-9')
        
        // Get the second page (10 records)
        const page2 = await adapter.getChangesSincePaginated(
            '2022-01-01T00:00:00.000Z',
            'device-2',
            10,
            10
        )
        
        expect(page2.length).toBe(10)
        expect(page2[0].id).toBe('record-10')
        expect(page2[9].id).toBe('record-19')
    })

    it('should prune the change table to prevent unbounded growth', async () => {
        // Create a large number of changes to the same record
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }
        
        // Make 200 updates to the record
        for (let i = 0; i < 200; i++) {
            const updatedRecord: Record = {
                ...record,
                data: {test: `data-${i}`},
                updatedAt: `2023-01-01T00:00:${i.toString().padStart(2, '0')}.000Z`
            }
            
            await adapter.applyRecords([updatedRecord], 'device-1')
        }
        
        // Get the change history for the record
        const history = adapter.getChangeHistory('test-id')
        
        // The history should be pruned to a reasonable size
        // (we keep the latest change for each record plus a buffer of recent changes)
        expect(history.length).toBeLessThan(200)
    })
})