"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
/**
 * Abstract base class for storage adapters
 *
 * Provides common functionality and enforces the StorageAdapter interface
 */
class BaseAdapter {
    /**
     * Helper method to convert a string timestamp to a Date object
     * @param timestamp Timestamp string
     * @returns Date object
     */
    parseTimestamp(timestamp) {
        return new Date(timestamp);
    }
    /**
     * Helper method to get the current timestamp as an ISO string
     * @returns Current timestamp
     */
    getCurrentTimestamp() {
        return new Date().toISOString();
    }
    /**
     * Helper method to compare two timestamps
     * @param a First timestamp
     * @param b Second timestamp
     * @returns -1 if a < b, 0 if a = b, 1 if a > b
     */
    compareTimestamps(a, b) {
        const dateA = this.parseTimestamp(a);
        const dateB = this.parseTimestamp(b);
        return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    }
}
exports.BaseAdapter = BaseAdapter;
