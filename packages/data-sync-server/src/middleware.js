"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAttachmentDownload = exports.handleAttachmentUpload = exports.handleSync = exports.authenticate = void 0;
const multer_1 = __importDefault(require("multer"));
/**
 * Creates middleware for authenticating sync requests
 * @param syncEngine The sync engine instance
 * @returns Express middleware function
 */
function authenticate(syncEngine) {
    return async (req, res, next) => {
        const apiKey = req.headers.authorization?.replace('Bearer ', '') || '';
        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }
        const isValid = await syncEngine.isValidApiKey(apiKey);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid API key' });
        }
        next();
    };
}
exports.authenticate = authenticate;
/**
 * Creates middleware for handling sync requests
 * @param syncEngine The sync engine instance
 * @returns Express request handler
 */
function handleSync(syncEngine) {
    return async (req, res) => {
        try {
            const payload = req.body;
            // console.log('Sync request received:', payload)
            // Validate the payload
            if (!payload.deviceId) {
                return res.status(400).json({ error: 'Device ID is required' });
            }
            // console.log(`Sync request from device: ${payload.deviceId}`)
            // Apply changes
            const result = await syncEngine.applyChanges(payload);
            if (req.query.debug) {
                console.log(await syncEngine.fetchAllData());
            }
            // Return the result
            res.json(result);
        }
        catch (error) {
            console.error('Sync error:', error);
            res.status(500).json({ error: 'Sync failed' });
        }
    };
}
exports.handleSync = handleSync;
/**
 * Creates middleware for handling attachment uploads
 * @param syncEngine The sync engine instance
 * @returns Array of middleware functions
 */
function handleAttachmentUpload(syncEngine) {
    // Configure multer for file uploads
    const upload = (0, multer_1.default)({
        storage: multer_1.default.memoryStorage(),
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB limit
        }
    });
    return [
        upload.single('file'),
        async (req, res) => {
            try {
                const file = req.file;
                const attachmentId = req.body.attachmentId;
                if (!file || !attachmentId) {
                    return res.status(400).json({ error: 'File and attachment ID are required' });
                }
                // Store the attachment
                await syncEngine.storeAttachment(file.buffer, {
                    id: attachmentId,
                    recordId: attachmentId.split('-')[0],
                    mimeType: file.mimetype,
                    size: file.size,
                    filename: file.originalname
                });
                res.status(200).json({ success: true });
            }
            catch (error) {
                console.error('Attachment upload error:', error);
                res.status(500).json({ error: 'Attachment upload failed' });
            }
        }
    ];
}
exports.handleAttachmentUpload = handleAttachmentUpload;
/**
 * Creates middleware for handling attachment downloads
 * @param syncEngine The sync engine instance
 * @returns Express request handler
 */
function handleAttachmentDownload(syncEngine) {
    return async (req, res) => {
        try {
            const attachmentId = req.params.id;
            if (!attachmentId) {
                return res.status(400).json({ error: 'Attachment ID is required' });
            }
            // Fetch the attachment
            const fileBuffer = await syncEngine.fetchAttachment(attachmentId);
            // Set appropriate headers
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${attachmentId}"`);
            // Send the file
            res.send(fileBuffer);
        }
        catch (error) {
            console.error('Attachment download error:', error);
            res.status(500).json({ error: 'Attachment download failed' });
        }
    };
}
exports.handleAttachmentDownload = handleAttachmentDownload;
