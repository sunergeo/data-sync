# Data Sync Examples

This directory contains examples demonstrating how to use the data sync packages for various scenarios.

## Basic Examples

- `server.ts`: A simple Express server that uses the data sync server package
- `client.ts`: A simple command-line client that demonstrates how to use the client SDK

## Advanced Examples

- `large-dataset-sync.ts`: Demonstrates strategies for handling large datasets (0-5000 records) and conflict resolution with multiple clients

## Strategies for Large Dataset Synchronization

When dealing with potentially thousands of records in a real-world application, sending all records during every sync operation would be inefficient. The following strategies are demonstrated in the examples:

### 1. Timestamp-Based Change Tracking

The most common approach is to maintain a "last modified" timestamp for each record:

- Update the `updatedAt` field whenever a record is modified
- During sync, only send records where `updatedAt` is greater than `lastSyncAt`

```typescript
async prepareRecordsForSync() {
  const recordsToSync = await this.localDatabase.getRecords({
    where: {
      updatedAt: { $gt: this.lastSyncAt }
    }
  });
  return recordsToSync;
}
```

### 2. Dirty Flags for Change Tracking

Add a "dirty" or "needsSync" flag to each record:

- Set the flag to `true` when a record is created or modified
- During sync, query only records with this flag set to `true`
- Reset the flag after successful synchronization

```typescript
async queueChange(record: Record): Promise<void> {
  record.updatedAt = new Date().toISOString();
  record.meta = { ...record.meta, needsSync: true };
  await this.localDatabase.saveRecord(record);
}

async prepareRecordsForSync() {
  return await this.localDatabase.getRecords({
    where: { 'meta.needsSync': true }
  });
}
```

### 3. Change Tracking Table

Maintain a separate change tracking table:

- When a record is modified, add an entry to the change tracking table
- During sync, query the change tracking table to determine which records to send
- Clear entries from the change tracking table after successful sync

```typescript
async trackChange(recordId: string, operation: 'update' | 'delete'): Promise<void> {
  await this.changeTracker.add({
    recordId,
    operation,
    timestamp: new Date().toISOString()
  });
}

async prepareRecordsForSync() {
  const changes = await this.changeTracker.getAll();
  const recordIds = changes
    .filter(change => change.operation === 'update')
    .map(change => change.recordId);
  
  return await this.localDatabase.getRecordsByIds(recordIds);
}
```

### 4. Incremental Sync with Pagination

For very large datasets:

- Implement pagination in your sync process
- Sync a limited number of records per request
- Track sync progress to continue where you left off

```typescript
async syncIncrementally(batchSize = 100): Promise<void> {
  let syncComplete = false;
  let offset = 0;
  
  while (!syncComplete) {
    const recordsToSync = await this.localDatabase.getRecords({
      where: { needsSync: true },
      limit: batchSize,
      offset: offset
    });
    
    if (recordsToSync.length === 0) {
      syncComplete = true;
      continue;
    }
    
    await this.syncBatch(recordsToSync);
    offset += batchSize;
  }
}
```

### 5. Prioritized Sync

Prioritize certain record types or changes:

- Assign priority levels to different record types
- Sync high-priority records first
- This ensures critical data is synchronized even if the entire sync doesn't complete

```typescript
async prepareRecordsForSync() {
  // First sync high-priority records
  const highPriorityRecords = await this.localDatabase.getRecords({
    where: { 
      needsSync: true,
      type: { $in: ['user', 'settings', 'critical-data'] }
    }
  });
  
  // Then sync regular records
  const regularRecords = await this.localDatabase.getRecords({
    where: { 
      needsSync: true,
      type: { $nin: ['user', 'settings', 'critical-data'] }
    }
  });
  
  return [...highPriorityRecords, ...regularRecords];
}
```

## Conflict Resolution Strategies

When multiple clients attempt to update the same record, conflicts can occur. The following strategies are demonstrated:

### 1. Last Write Wins

The simplest strategy is to use the record with the latest timestamp:

```typescript
function resolveConflict(existing: Record, incoming: Record): Record {
  return new Date(incoming.updatedAt) > new Date(existing.updatedAt) 
    ? incoming 
    : existing;
}
```

### 2. Version Vectors

For more accurate conflict detection, use version vectors (also known as vector clocks):

```typescript
interface VersionVector {
  [deviceId: string]: number;
}

function resolveConflict(record1: Record, record2: Record): Record {
  const vector1 = record1.meta.versionVector;
  const vector2 = record2.meta.versionVector;
  
  // Merge the version vectors
  const mergedVector = {...vector1};
  for (const deviceId in vector2) {
    mergedVector[deviceId] = Math.max(
      mergedVector[deviceId] || 0,
      vector2[deviceId]
    );
  }
  
  // Use the record with the later timestamp
  const useRecord1 = new Date(record1.updatedAt) >= new Date(record2.updatedAt);
  
  return {
    ...(useRecord1 ? record1 : record2),
    meta: {
      ...(useRecord1 ? record1.meta : record2.meta),
      versionVector: mergedVector
    }
  };
}
```

### 3. Field-Level Merging

For more sophisticated conflict resolution, merge fields from both records:

```typescript
function resolveConflict(record1: Record, record2: Record): Record {
  // Merge the data fields
  const mergedData = {
    ...record1.data,
    ...record2.data
  };
  
  // Use the later timestamp
  const timestamp = new Date(record1.updatedAt) > new Date(record2.updatedAt)
    ? record1.updatedAt
    : record2.updatedAt;
  
  return {
    id: record1.id,
    type: record1.type,
    data: mergedData,
    updatedAt: timestamp
  };
}
```

## Running the Examples

1. Start the server:
   ```
   npm run start:server
   ```

2. Run the client:
   ```
   npm run start:client
   ```

3. Run the large dataset sync example:
   ```
   npm run start:large-dataset
   ```

Make sure to update the package.json scripts to include these commands.