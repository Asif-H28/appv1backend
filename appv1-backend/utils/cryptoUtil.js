const crypto = require('crypto');

// The algorithm to use
const algorithm = 'aes-256-cbc';

// Secret key should be exactly 32 bytes (256 bits) for aes-256-cbc.
// In production, this MUST come from process.env.ENCRYPTION_SECRET.
// Fallback is provided ONLY for development so it doesn't crash immediately.
const secretKey = process.env.ENCRYPTION_SECRET || '0123456789abcdef0123456789abcdef'; 
const key = crypto.scryptSync(secretKey, 'salt', 32); 

/**
 * Encrypts a plain text string.
 * @param {string} text 
 * @returns {string} Encrypted text in format iv:encryptedData
 */
function encrypt(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        return text;
    }
}

/**
 * Decrypts an encrypted text string.
 * @param {string} encryptedText 
 * @returns {string} Decrypted text
 */
function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    try {
        const textParts = encryptedText.split(':');
        // If it doesn't have an IV part, it might not be encrypted
        if (textParts.length !== 2) return encryptedText;

        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedData = Buffer.from(textParts[1], 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return encryptedText; // Return original on failure (might be unencrypted legacy data)
    }
}

module.exports = {
    encrypt,
    decrypt
};
