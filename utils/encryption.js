const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_encryption_key_32_chars!';

// Encrypt sensitive data
const encrypt = (text) => {
    if (!text) return null;
    return CryptoJS.AES.encrypt(text.toString(), ENCRYPTION_KEY).toString();
};

// Decrypt sensitive data
const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
};

// Mask sensitive data for display
const maskAadhaar = (aadhaar) => {
    if (!aadhaar || aadhaar.length !== 12) return aadhaar;
    return 'XXXX-XXXX-' + aadhaar.slice(-4);
};

const maskBankAccount = (account) => {
    if (!account || account.length < 4) return account;
    return 'XXXXX' + account.slice(-4);
};

const maskPhone = (phone) => {
    if (!phone || phone.length < 4) return phone;
    return phone.slice(0, 3) + 'XXXXX' + phone.slice(-2);
};

// Sanitize object for logging (remove sensitive fields)
const sanitizeForLog = (obj) => {
    if (!obj) return obj;
    
    const sensitiveFields = [
        'password', 'password_hash', 'token', 'aadhaar_number', 
        'bank_account', 'aadhaar_number_encrypted', 'bank_account_encrypted'
    ];
    
    const sanitized = { ...obj };
    
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    
    return sanitized;
};

module.exports = {
    encrypt,
    decrypt,
    maskAadhaar,
    maskBankAccount,
    maskPhone,
    sanitizeForLog
};
