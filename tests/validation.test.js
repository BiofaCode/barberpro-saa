/**
 * Validation utilities tests
 */

const {
    validateEmail,
    validatePassword,
    validateSalonName,
    validatePhoneNumber,
    validateURL,
    validateServiceName,
    validateDuration,
    validatePrice,
    validateWebhookURL,
    validateHexColor
} = require('../lib/validation');

describe('Input Validation', () => {
    describe('validateEmail', () => {
        it('should accept valid email', () => {
            const result = validateEmail('user@example.com');
            expect(result.valid).toBe(true);
        });

        it('should reject invalid email', () => {
            const result = validateEmail('notanemail');
            expect(result.valid).toBe(false);
        });

        it('should reject missing email', () => {
            const result = validateEmail('');
            expect(result.valid).toBe(false);
        });
    });

    describe('validatePassword', () => {
        it('should accept valid password', () => {
            const result = validatePassword('password123');
            expect(result.valid).toBe(true);
        });

        it('should reject short password', () => {
            const result = validatePassword('abc');
            expect(result.valid).toBe(false);
        });

        it('should reject missing password', () => {
            const result = validatePassword('');
            expect(result.valid).toBe(false);
        });
    });

    describe('validateSalonName', () => {
        it('should accept valid salon name', () => {
            const result = validateSalonName('Elite Barber Shop');
            expect(result.valid).toBe(true);
        });

        it('should reject short name', () => {
            const result = validateSalonName('A');
            expect(result.valid).toBe(false);
        });

        it('should reject very long name', () => {
            const result = validateSalonName('A'.repeat(101));
            expect(result.valid).toBe(false);
        });
    });

    describe('validatePhoneNumber', () => {
        it('should accept valid phone number', () => {
            const result = validatePhoneNumber('+41223334444');
            expect(result.valid).toBe(true);
        });

        it('should accept phone with formatting', () => {
            const result = validatePhoneNumber('022 333 4444');
            expect(result.valid).toBe(true);
        });

        it('should reject too short number', () => {
            const result = validatePhoneNumber('123');
            expect(result.valid).toBe(false);
        });
    });

    describe('validateURL', () => {
        it('should accept valid HTTP URL', () => {
            const result = validateURL('http://example.com');
            expect(result.valid).toBe(true);
        });

        it('should accept valid HTTPS URL', () => {
            const result = validateURL('https://example.com');
            expect(result.valid).toBe(true);
        });

        it('should reject invalid URL', () => {
            const result = validateURL('not a url');
            expect(result.valid).toBe(false);
        });
    });

    describe('validateDuration', () => {
        it('should accept valid duration (30 minutes)', () => {
            const result = validateDuration(30);
            expect(result.valid).toBe(true);
        });

        it('should reject too short duration', () => {
            const result = validateDuration(2);
            expect(result.valid).toBe(false);
        });

        it('should reject too long duration', () => {
            const result = validateDuration(500);
            expect(result.valid).toBe(false);
        });
    });

    describe('validatePrice', () => {
        it('should accept valid price', () => {
            const result = validatePrice(25.50);
            expect(result.valid).toBe(true);
        });

        it('should reject negative price', () => {
            const result = validatePrice(-10);
            expect(result.valid).toBe(false);
        });

        it('should reject too high price', () => {
            const result = validatePrice(10000);
            expect(result.valid).toBe(false);
        });
    });

    describe('validateWebhookURL', () => {
        it('should accept valid HTTPS webhook URL', () => {
            const result = validateWebhookURL('https://example.com/webhook');
            expect(result.valid).toBe(true);
        });

        it('should reject localhost', () => {
            const result = validateWebhookURL('http://localhost:3000/webhook');
            expect(result.valid).toBe(false);
        });

        it('should reject private IP ranges', () => {
            const result = validateWebhookURL('https://192.168.1.1/webhook');
            expect(result.valid).toBe(false);
        });

        it('should reject HTTP (require HTTPS)', () => {
            const result = validateWebhookURL('http://example.com/webhook');
            expect(result.valid).toBe(false);
        });
    });

    describe('validateHexColor', () => {
        it('should accept valid hex color', () => {
            const result = validateHexColor('#FF5733');
            expect(result.valid).toBe(true);
        });

        it('should reject invalid hex color', () => {
            const result = validateHexColor('FF5733');
            expect(result.valid).toBe(false);
        });

        it('should reject short hex', () => {
            const result = validateHexColor('#F57');
            expect(result.valid).toBe(false);
        });
    });
});
