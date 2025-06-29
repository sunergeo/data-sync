import {Record as SyncRecord, AttachmentMeta} from '@sunergeo/data-sync-server'
import {BaseAdapter} from './BaseAdapter'

// Define a simplified interface for the S3 client
interface S3Client {
    upload(params: {
        Bucket: string
        Key: string
        Body: Buffer
        ContentType: string
        Metadata: Record<string, string>
    }): {promise(): Promise<any>}

    getObject(params: {Bucket: string; Key: string}): {promise(): Promise<{Body?: any}>}

    deleteObject(params: {Bucket: string; Key: string}): {promise(): Promise<any>}
}

/**
 * Options for the S3 adapter
 */
export interface S3AdapterOptions {
    /** S3 client instance */
    s3Client: S3Client
    /** Bucket name for attachments */
    attachmentsBucket: string
    /** Prefix for attachment keys (default: 'attachments/') */
    attachmentsPrefix?: string
    /** Storage adapter for records and change tracking */
    recordsAdapter: BaseAdapter
}

/**
 * S3 storage adapter
 *
 * Stores attachments in AWS S3 and delegates record storage to another adapter.
 * Requires the aws-sdk package to be installed.
 */
export class S3Adapter extends BaseAdapter {
    private options: Required<S3AdapterOptions>

    /**
     * Creates a new S3Adapter instance
     * @param options Options for the adapter
     */
    constructor(options: S3AdapterOptions) {
        super()

        // Set default options
        this.options = {
            s3Client: options.s3Client,
            attachmentsBucket: options.attachmentsBucket,
            attachmentsPrefix: options.attachmentsPrefix || 'attachments/',
            recordsAdapter: options.recordsAdapter
        }

        // Ensure the S3 client is provided
        if (!this.options.s3Client) {
            throw new Error('S3 client is required for S3Adapter')
        }

        // Ensure the attachments bucket is provided
        if (!this.options.attachmentsBucket) {
            throw new Error('Attachments bucket is required for S3Adapter')
        }

        // Ensure the records adapter is provided
        if (!this.options.recordsAdapter) {
            throw new Error('Records adapter is required for S3Adapter')
        }
    }

    getAllRecords(): Promise<SyncRecord[]> {
        throw new Error('Method not implemented.')
    }

    /**
     * Get changes since a specific timestamp
     * @param timestamp Timestamp to get changes since
     * @param deviceId ID of the device requesting changes
     * @returns Records changed since the timestamp
     */
    async getChangesSince(timestamp: string, deviceId: string): Promise<SyncRecord[]> {
        // Delegate to the records adapter
        return this.options.recordsAdapter.getChangesSince(timestamp, deviceId)
    }

    /**
     * Apply records to storage
     * @param records Records to apply
     * @param deviceId ID of the device applying the records
     */
    async applyRecords(records: SyncRecord[], deviceId: string): Promise<void> {
        // Delegate to the records adapter
        await this.options.recordsAdapter.applyRecords(records, deviceId)
    }

    /**
     * Store an attachment in S3
     * @param file File buffer
     * @param metadata Metadata for the attachment
     * @returns ID of the stored attachment
     */
    async storeAttachment(file: Buffer, metadata: AttachmentMeta): Promise<string> {
        const key = `${this.options.attachmentsPrefix}${metadata.id}`

        // Upload the file to S3
        await this.options.s3Client
            .upload({
                Bucket: this.options.attachmentsBucket,
                Key: key,
                Body: file,
                ContentType: metadata.mimeType,
                Metadata: {
                    recordId: metadata.recordId,
                    filename: metadata.filename,
                    size: metadata.size.toString()
                }
            })
            .promise()

        return metadata.id
    }

    /**
     * Fetch an attachment from S3
     * @param attachmentId ID of the attachment to fetch
     * @returns The attachment buffer
     */
    async fetchAttachment(attachmentId: string): Promise<Buffer> {
        const key = `${this.options.attachmentsPrefix}${attachmentId}`

        try {
            // Get the file from S3
            const response = await this.options.s3Client
                .getObject({
                    Bucket: this.options.attachmentsBucket,
                    Key: key
                })
                .promise()

            // Convert the response body to a Buffer
            if (!response.Body) {
                throw new Error(`Attachment not found: ${attachmentId}`)
            }

            return Buffer.from(response.Body as Buffer)
        } catch (error) {
            if ((error as any).code === 'NoSuchKey') {
                throw new Error(`Attachment not found: ${attachmentId}`)
            }
            throw error
        }
    }

    /**
     * Delete an attachment from S3
     * @param attachmentId ID of the attachment to delete
     */
    async deleteAttachment(attachmentId: string): Promise<void> {
        const key = `${this.options.attachmentsPrefix}${attachmentId}`

        await this.options.s3Client
            .deleteObject({
                Bucket: this.options.attachmentsBucket,
                Key: key
            })
            .promise()
    }
}
