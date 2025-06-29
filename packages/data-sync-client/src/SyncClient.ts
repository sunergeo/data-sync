import {SyncClientOptions, Record, SyncResult, AttachmentMeta, SyncPayload} from './types'

/**
 * Client for synchronizing data between local storage and a remote server
 */
export class SyncClient {
    private options: SyncClientOptions
    private lastSyncAt: string = ''
    private pendingChanges: Record[] = []
    private pendingDeletions: string[] = []
    private pendingAttachments: Map<string, File> = new Map()

    /**
     * Creates a new SyncClient instance
     * @param options Configuration options for the client
     */
    constructor(options: SyncClientOptions) {
        this.options = options
    }

    /**
     * Synchronizes local changes with the server
     * @returns Result of the sync operation
     */
    async sync(): Promise<SyncResult> {
        try {
            // Prepare the payload
            const payload: SyncPayload = {
                records: this.pendingChanges,
                deletedIds: this.pendingDeletions,
                attachments: Array.from(this.pendingAttachments.entries()).map(([id, file]) => ({
                    id,
                    recordId: id.split('-')[0], // Assuming format: recordId-filename
                    mimeType: file.type,
                    size: file.size,
                    filename: file.name
                })),
                deviceId: this.options.deviceId,
                lastSyncAt: this.lastSyncAt
            }

            // Send the sync request
            const response = await fetch(`${this.options.endpoint}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.options.apiKey}`
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                throw new Error(`Sync failed: ${response.statusText}`)
            }

            const result: SyncResult = await response.json()

            // Upload any pending attachments
            if (this.pendingAttachments.size > 0) {
                await this.uploadAttachments()
            }

            // Update the last sync timestamp
            this.lastSyncAt = result.syncTimestamp

            // Clear pending changes
            this.pendingChanges = []
            this.pendingDeletions = []
            this.pendingAttachments.clear()

            return result
        } catch (error) {
            console.error('Sync error:', error)
            throw error
        }
    }

    /**
     * Queues a record for synchronization
     * @param record The record to queue
     */
    async queueChange(record: Record): Promise<void> {
        // Ensure the record has an updatedAt timestamp
        if (!record.updatedAt) {
            record.updatedAt = new Date().toISOString()
        }

        // Add to pending changes
        const existingIndex = this.pendingChanges.findIndex((r) => r.id === record.id)
        if (existingIndex >= 0) {
            this.pendingChanges[existingIndex] = record
        } else {
            this.pendingChanges.push(record)
        }
    }

    /**
     * Queues a record deletion for synchronization
     * @param recordId ID of the record to delete
     */
    async queueDeletion(recordId: string): Promise<void> {
        // Remove from pending changes if present
        this.pendingChanges = this.pendingChanges.filter((r) => r.id !== recordId)

        // Add to pending deletions if not already there
        if (!this.pendingDeletions.includes(recordId)) {
            this.pendingDeletions.push(recordId)
        }
    }

    /**
     * Attaches a file to a record
     * @param recordId ID of the record to attach the file to
     * @param file The file to attach
     */
    async attachFile(recordId: string, file: File): Promise<void> {
        const attachmentId = `${recordId}-${file.name}`
        this.pendingAttachments.set(attachmentId, file)
    }

    /**
     * Uploads pending attachments to the server
     * @private
     */
    private async uploadAttachments(): Promise<void> {
        const uploadPromises = Array.from(this.pendingAttachments.entries()).map(async ([id, file]) => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('attachmentId', id)

            const response = await fetch(`${this.options.endpoint}/attachments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.options.apiKey}`
                },
                body: formData
            })

            if (!response.ok) {
                throw new Error(`Failed to upload attachment ${id}: ${response.statusText}`)
            }
        })

        await Promise.all(uploadPromises)
    }
}
