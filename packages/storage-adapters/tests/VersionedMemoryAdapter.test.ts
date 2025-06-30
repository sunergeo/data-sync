import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {VersionedMemoryAdapter} from '../src/VersionedMemoryAdapter'
import {Record} from '@sunergeo/data-sync-server'

describe('VersionedMemoryAdapter', () => {
    let adapter: VersionedMemoryAdapter

    beforeEach(() => {
        adapter = new VersionedMemoryAdapter()
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

    it('should track version vectors for records', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        await adapter.applyRecords([record], 'device-1')
        const records = await adapter.getAllRecords()

        // Check that the version vector was added
        expect(records[0].meta?.versionVector).toBeDefined()
        expect(records[0].meta?.versionVector['device-1']).toBe(1)
    })

    it('should increment version vectors when records are updated', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        // First update from device-1
        await adapter.applyRecords([record], 'device-1')

        // Second update from device-1
        const updatedRecord: Record = {
            ...record,
            data: {test: 'updated-data'},
            updatedAt: '2023-01-02T00:00:00.000Z'
        }
        await adapter.applyRecords([updatedRecord], 'device-1')

        const records = await adapter.getAllRecords()

        // Check that the version vector was incremented
        expect(records[0].meta?.versionVector['device-1']).toBe(2)
    })

    it('should handle updates from multiple devices', async () => {
        const record: Record = {
            id: 'test-id',
            type: 'test-type',
            data: {test: 'data'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }

        // Update from device-1
        await adapter.applyRecords([record], 'device-1')

        // Update from device-2
        const device2Record: Record = {
            ...record,
            data: {test: 'device-2-data'},
            updatedAt: '2023-01-02T00:00:00.000Z'
        }
        await adapter.applyRecords([device2Record], 'device-2')

        const records = await adapter.getAllRecords()

        // Check that the version vector includes both devices
        expect(records[0].meta?.versionVector['device-1']).toBe(1)
        expect(records[0].meta?.versionVector['device-2']).toBe(1)

        // The data should be from device-2 since it has a later timestamp
        expect(records[0].data.test).toBe('device-2-data')
    })

    it('should detect and resolve conflicts using version vectors', async () => {
        // Initial record from device-1
        const initialRecord: Record = {
            id: 'conflict-id',
            type: 'test-type',
            data: {field1: 'value1', shared: 'initial'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }
        await adapter.applyRecords([initialRecord], 'device-1')

        // Get the record with its version vector
        const initialRecords = await adapter.getAllRecords()
        const recordWithVector = initialRecords[0]

        // Device-2 updates the record (changing field2)
        const device2Record: Record = {
            ...recordWithVector,
            data: {field1: 'value1', field2: 'value2', shared: 'device-2'},
            updatedAt: '2023-01-02T00:00:00.000Z'
        }
        await adapter.applyRecords([device2Record], 'device-2')

        // Device-3 updates the original record (changing field3)
        // This creates a conflict because device-3 doesn't know about device-2's update
        const device3Record: Record = {
            ...recordWithVector,
            data: {field1: 'value1', field3: 'value3', shared: 'device-3'},
            updatedAt: '2023-01-03T00:00:00.000Z'
        }
        await adapter.applyRecords([device3Record], 'device-3')

        // Get the final state of the record
        const finalRecords = await adapter.getAllRecords()
        const finalRecord = finalRecords[0]

        // Check that the version vector includes all three devices
        expect(finalRecord.meta?.versionVector['device-1']).toBe(1)
        expect(finalRecord.meta?.versionVector['device-2']).toBe(1)
        expect(finalRecord.meta?.versionVector['device-3']).toBe(1)

        // The shared field should be from device-3 since it has the latest timestamp
        expect(finalRecord.data.shared).toBe('device-3')
    })

    it.skip('should handle concurrent updates that modify different fields', async () => {
        // Initial record
        const initialRecord: Record = {
            id: 'concurrent-id',
            type: 'test-type',
            data: {field1: 'initial'},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }
        await adapter.applyRecords([initialRecord], 'device-1')

        // Get the record with its version vector
        const initialRecords = await adapter.getAllRecords()
        const recordWithVector = initialRecords[0]

        // Create a custom conflict resolution strategy that merges fields
        const originalResolveConflict = (adapter as any).resolveConflict.bind(adapter)

        // Override the resolveConflict method to merge data fields
        // This is just for testing - in a real implementation, you would subclass or configure the adapter
        (adapter as any).resolveConflict = (record1: any, record2: any) => {
            // The original resolveConflict method now handles undefined records

            // Create proper versioned records with required properties
            const versionedRecord1 = {
                ...record1,
                meta: {
                    ...(record1.meta || {}),
                    versionVector: record1.meta?.versionVector || {}
                },
                updatedAt: record1.updatedAt || new Date().toISOString()
            };

            const versionedRecord2 = {
                ...record2,
                meta: {
                    ...(record2.meta || {}),
                    versionVector: record2.meta?.versionVector || {}
                },
                updatedAt: record2.updatedAt || new Date().toISOString()
            };

            // Call the original method with properly formatted records
            const baseResult = originalResolveConflict(versionedRecord1, versionedRecord2)

            // Merge the data fields
            baseResult.data = {
                ...(record1.data || {}),
                ...(record2.data || {})
            }

            return baseResult
        }

        // Device-2 adds field2
        const device2Record: Record = {
            ...recordWithVector,
            data: {field1: 'initial', field2: 'from-device-2'},
            updatedAt: '2023-01-02T00:00:00.000Z'
        }

        // Device-3 adds field3
        const device3Record: Record = {
            ...recordWithVector,
            data: {field1: 'initial', field3: 'from-device-3'},
            updatedAt: '2023-01-02T00:00:00.000Z' // Same timestamp to ensure conflict
        }

        // Apply both updates (order shouldn't matter due to version vectors)
        await adapter.applyRecords([device2Record], 'device-2')
        await adapter.applyRecords([device3Record], 'device-3')

        // Get the final state of the record
        const finalRecords = await adapter.getAllRecords()
        const finalRecord = finalRecords[0]

        // Check that the version vector includes all three devices
        expect(finalRecord.meta?.versionVector['device-1']).toBe(1)
        expect(finalRecord.meta?.versionVector['device-2']).toBe(1)
        expect(finalRecord.meta?.versionVector['device-3']).toBe(1)

        // Check that all fields were merged
        expect(finalRecord.data.field1).toBe('initial')
        expect(finalRecord.data.field2).toBe('from-device-2')
        expect(finalRecord.data.field3).toBe('from-device-3')
    })

    it('should handle large numbers of concurrent updates', async () => {
        // Initial record
        const initialRecord: Record = {
            id: 'many-updates-id',
            type: 'test-type',
            data: {counter: 0},
            updatedAt: '2023-01-01T00:00:00.000Z'
        }
        await adapter.applyRecords([initialRecord], 'device-1')

        // Get the record with its version vector
        const initialRecords = await adapter.getAllRecords()
        const recordWithVector = initialRecords[0]

        // Create 10 concurrent updates from different devices
        const updates: Promise<void>[] = []

        for (let i = 2; i <= 11; i++) {
            const deviceId = `device-${i}`
            const updateRecord: Record = {
                ...recordWithVector,
                data: {counter: i, [`field-${i}`]: `value-${i}`},
                updatedAt: `2023-01-0${i}T00:00:00.000Z`
            }

            updates.push(adapter.applyRecords([updateRecord], deviceId))
        }

        // Apply all updates concurrently
        await Promise.all(updates)

        // Get the final state of the record
        const finalRecords = await adapter.getAllRecords()
        const finalRecord = finalRecords[0]

        // Check that the version vector includes all devices
        for (let i = 1; i <= 11; i++) {
            expect(finalRecord.meta?.versionVector[`device-${i}`]).toBe(1)
        }

        // The counter should be 11 (from device-11) since it has the latest timestamp
        expect(finalRecord.data.counter).toBe(11)
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
})
