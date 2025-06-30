/**
 * Example demonstrating strategies for handling large datasets (0-5000 records)
 * and conflict resolution with multiple clients.
 */
import { SyncClient, Record } from '@sunergeo/data-sync-client';
import * as crypto from 'crypto';

// Configuration
const API_KEY = 'demo-api-key';
const ENDPOINT = 'http://localhost:3000';

// Create multiple clients to simulate different devices
const createClient = (deviceName: string) => {
  const deviceId = `${deviceName}-${crypto.randomBytes(4).toString('hex')}`;
  return {
    client: new SyncClient({
      apiKey: API_KEY,
      endpoint: ENDPOINT,
      deviceId
    }),
    deviceId
  };
};

// Generate a dataset of specified size
const generateDataset = (size: number, prefix: string = ''): Record[] => {
  const records: Record[] = [];
  
  for (let i = 0; i < size; i++) {
    const id = `record-${prefix}-${i}`;
    records.push({
      id,
      type: 'test-data',
      data: {
        title: `Test Record ${i}`,
        value: Math.random() * 1000,
        tags: [`tag-${i % 5}`, `priority-${i % 3}`]
      },
      updatedAt: new Date().toISOString()
    });
  }
  
  return records;
};

// Strategy 1: Timestamp-based change tracking
async function demonstrateTimestampBasedSync() {
  console.log('\n=== STRATEGY 1: TIMESTAMP-BASED CHANGE TRACKING ===');
  
  const { client, deviceId } = createClient('timestamp-client');
  console.log(`Client created with device ID: ${deviceId}`);
  
  // Generate a small dataset (10 records)
  const smallDataset = generateDataset(10, 'timestamp');
  
  // Queue records for sync
  console.log('Queuing 10 records for sync...');
  for (const record of smallDataset) {
    await client.queueChange(record);
  }
  
  // Perform initial sync
  console.log('Performing initial sync...');
  const initialResult = await client.sync();
  console.log(`Initial sync completed. Timestamp: ${initialResult.syncTimestamp}`);
  
  // Modify some records
  console.log('Modifying 3 records...');
  for (let i = 0; i < 3; i++) {
    const record = smallDataset[i];
    record.data.value = Math.random() * 1000;
    record.updatedAt = new Date().toISOString();
    await client.queueChange(record);
  }
  
  // Perform second sync - only modified records should be sent
  console.log('Performing second sync...');
  const secondResult = await client.sync();
  console.log(`Second sync completed. Timestamp: ${secondResult.syncTimestamp}`);
  
  return { initialResult, secondResult };
}

// Strategy 2: Dirty flags for change tracking
async function demonstrateDirtyFlagSync() {
  console.log('\n=== STRATEGY 2: DIRTY FLAGS FOR CHANGE TRACKING ===');
  
  const { client, deviceId } = createClient('dirty-flag-client');
  console.log(`Client created with device ID: ${deviceId}`);
  
  // Generate a medium dataset (100 records)
  const mediumDataset = generateDataset(100, 'dirty-flag');
  
  // Add needsSync flag to records
  const enhancedDataset = mediumDataset.map(record => ({
    ...record,
    meta: { needsSync: true }
  }));
  
  // Queue records for sync
  console.log('Queuing 100 records for sync...');
  for (const record of enhancedDataset) {
    await client.queueChange(record);
  }
  
  // Perform initial sync
  console.log('Performing initial sync...');
  const initialResult = await client.sync();
  console.log(`Initial sync completed. Timestamp: ${initialResult.syncTimestamp}`);
  
  // Modify some records and mark them as needing sync
  console.log('Modifying 10 records...');
  for (let i = 0; i < 10; i++) {
    const record = enhancedDataset[i];
    record.data.value = Math.random() * 1000;
    record.updatedAt = new Date().toISOString();
    record.meta = { needsSync: true };
    await client.queueChange(record);
  }
  
  // Perform second sync - only modified records should be sent
  console.log('Performing second sync...');
  const secondResult = await client.sync();
  console.log(`Second sync completed. Timestamp: ${secondResult.syncTimestamp}`);
  
  return { initialResult, secondResult };
}

// Strategy 3: Incremental sync with pagination
async function demonstrateIncrementalSync() {
  console.log('\n=== STRATEGY 3: INCREMENTAL SYNC WITH PAGINATION ===');
  
  const { client, deviceId } = createClient('incremental-client');
  console.log(`Client created with device ID: ${deviceId}`);
  
  // Generate a large dataset (1000 records)
  const largeDataset = generateDataset(1000, 'incremental');
  
  // Queue records for sync in batches
  const batchSize = 100;
  const batches = Math.ceil(largeDataset.length / batchSize);
  
  console.log(`Queuing ${largeDataset.length} records in ${batches} batches...`);
  
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, largeDataset.length);
    const batch = largeDataset.slice(start, end);
    
    console.log(`Queuing batch ${i + 1}/${batches} (${batch.length} records)...`);
    for (const record of batch) {
      await client.queueChange(record);
    }
    
    // Sync after each batch
    console.log(`Syncing batch ${i + 1}...`);
    const result = await client.sync();
    console.log(`Batch ${i + 1} sync completed. Timestamp: ${result.syncTimestamp}`);
  }
  
  console.log('All batches synced successfully.');
}

// Strategy 4: Prioritized sync
async function demonstratePrioritizedSync() {
  console.log('\n=== STRATEGY 4: PRIORITIZED SYNC ===');
  
  const { client, deviceId } = createClient('priority-client');
  console.log(`Client created with device ID: ${deviceId}`);
  
  // Generate a medium dataset (100 records)
  const mediumDataset = generateDataset(100, 'priority');
  
  // Assign priorities to records
  const prioritizedDataset = mediumDataset.map((record, index) => ({
    ...record,
    meta: { 
      priority: index % 10 === 0 ? 'high' : 
                index % 5 === 0 ? 'medium' : 'low'
    }
  }));
  
  // Queue high-priority records first
  const highPriorityRecords = prioritizedDataset.filter(r => r.meta?.priority === 'high');
  const mediumPriorityRecords = prioritizedDataset.filter(r => r.meta?.priority === 'medium');
  const lowPriorityRecords = prioritizedDataset.filter(r => r.meta?.priority === 'low');
  
  console.log(`Queuing ${highPriorityRecords.length} high-priority records...`);
  for (const record of highPriorityRecords) {
    await client.queueChange(record);
  }
  
  console.log('Syncing high-priority records...');
  const highPriorityResult = await client.sync();
  console.log(`High-priority sync completed. Timestamp: ${highPriorityResult.syncTimestamp}`);
  
  console.log(`Queuing ${mediumPriorityRecords.length} medium-priority records...`);
  for (const record of mediumPriorityRecords) {
    await client.queueChange(record);
  }
  
  console.log('Syncing medium-priority records...');
  const mediumPriorityResult = await client.sync();
  console.log(`Medium-priority sync completed. Timestamp: ${mediumPriorityResult.syncTimestamp}`);
  
  console.log(`Queuing ${lowPriorityRecords.length} low-priority records...`);
  for (const record of lowPriorityRecords) {
    await client.queueChange(record);
  }
  
  console.log('Syncing low-priority records...');
  const lowPriorityResult = await client.sync();
  console.log(`Low-priority sync completed. Timestamp: ${lowPriorityResult.syncTimestamp}`);
  
  console.log('All priority levels synced successfully.');
}

// Strategy 5: Conflict resolution with multiple clients
async function demonstrateConflictResolution() {
  console.log('\n=== STRATEGY 5: CONFLICT RESOLUTION WITH MULTIPLE CLIENTS ===');
  
  // Create two clients
  const { client: client1, deviceId: deviceId1 } = createClient('client-1');
  const { client: client2, deviceId: deviceId2 } = createClient('client-2');
  
  console.log(`Created client 1 with device ID: ${deviceId1}`);
  console.log(`Created client 2 with device ID: ${deviceId2}`);
  
  // Create a shared record that both clients will modify
  const sharedRecord: Record = {
    id: `shared-record-${crypto.randomBytes(4).toString('hex')}`,
    type: 'shared-data',
    data: {
      title: 'Shared Record',
      value: 100,
      lastEditor: 'none'
    },
    updatedAt: new Date().toISOString()
  };
  
  // Client 1 creates the record and syncs
  console.log('Client 1 creating shared record...');
  await client1.queueChange(sharedRecord);
  const client1InitialSync = await client1.sync();
  console.log(`Client 1 initial sync completed. Timestamp: ${client1InitialSync.syncTimestamp}`);
  
  // Client 2 syncs to get the record
  console.log('Client 2 syncing to get the shared record...');
  const client2InitialSync = await client2.sync();
  console.log(`Client 2 initial sync completed. Timestamp: ${client2InitialSync.syncTimestamp}`);
  
  // Both clients modify the record
  console.log('Both clients modifying the shared record...');
  
  // Client 1 modification
  const client1Record = {
    ...sharedRecord,
    data: {
      ...sharedRecord.data,
      value: 200,
      lastEditor: deviceId1
    },
    updatedAt: new Date().toISOString()
  };
  await client1.queueChange(client1Record);
  
  // Wait a moment to ensure different timestamps
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Client 2 modification (with a later timestamp)
  const client2Record = {
    ...sharedRecord,
    data: {
      ...sharedRecord.data,
      value: 300,
      lastEditor: deviceId2
    },
    updatedAt: new Date().toISOString()
  };
  await client2.queueChange(client2Record);
  
  // Client 1 syncs first
  console.log('Client 1 syncing its changes...');
  const client1SecondSync = await client1.sync();
  console.log(`Client 1 second sync completed. Timestamp: ${client1SecondSync.syncTimestamp}`);
  
  // Client 2 syncs second (should detect conflict)
  console.log('Client 2 syncing its changes (potential conflict)...');
  const client2SecondSync = await client2.sync();
  console.log(`Client 2 second sync completed. Timestamp: ${client2SecondSync.syncTimestamp}`);
  
  // Check for conflicts
  if (client2SecondSync.conflicts && client2SecondSync.conflicts.length > 0) {
    console.log('Conflict detected!');
    console.log('Conflict details:', JSON.stringify(client2SecondSync.conflicts, null, 2));
    
    // Resolve conflict (in this case, we'll take the latest change)
    console.log('Resolving conflict by taking the latest change...');
    const resolvedRecord = client2SecondSync.conflicts[0].remoteVersion;
    await client2.queueChange(resolvedRecord);
    const client2ResolveSync = await client2.sync();
    console.log(`Client 2 conflict resolution sync completed. Timestamp: ${client2ResolveSync.syncTimestamp}`);
  } else {
    console.log('No conflicts detected. Last-write-wins strategy applied automatically.');
  }
  
  // Both clients sync one more time to ensure they have the same data
  console.log('Both clients syncing one more time to ensure data consistency...');
  const client1FinalSync = await client1.sync();
  const client2FinalSync = await client2.sync();
  
  console.log('Conflict resolution demonstration completed.');
}

// Main function to run all demonstrations
async function main() {
  try {
    console.log('=== LARGE DATASET SYNC STRATEGIES DEMONSTRATION ===');
    
    // Run each strategy demonstration
    await demonstrateTimestampBasedSync();
    await demonstrateDirtyFlagSync();
    await demonstrateIncrementalSync();
    await demonstratePrioritizedSync();
    await demonstrateConflictResolution();
    
    console.log('\n=== ALL DEMONSTRATIONS COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error during demonstration:', error);
  }
}

// Run the main function
main().catch(console.error);