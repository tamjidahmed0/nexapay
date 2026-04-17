import { Injectable, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

interface EncryptedPayload {
    ct: string;   // ciphertext hex
    iv: string;   // field iv hex
    at: string;   // field authTag hex
    dk: string;   // encrypted DEK hex
    div: string;  // DEK iv hex
    dat: string;  // DEK authTag hex
}

@Injectable()
export class EncryptionService implements OnModuleInit {
    private kek!: Buffer;

    onModuleInit() {
        const keyHex = process.env.ENCRYPTION_MASTER_KEY;

        if (!keyHex || keyHex.length !== 64) {
            throw new Error(
                'ENCRYPTION_MASTER_KEY must be a 64-char hex string. ' +
                'Generate with: openssl rand -hex 32',
            );
        }

        this.kek = Buffer.from(keyHex, 'hex');
    }

    /**
     * Encrypt a plaintext string.
     * Returns a single "v1:base64(json)" string — safe to store in any TEXT column.
     * DEK is embedded inside the same column, no extra columns needed.
     */
    encrypt(plaintext: string): string {
        const dek = randomBytes(32);

        // Encrypt field value with DEK
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', dek, iv);
        const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const at = cipher.getAuthTag();

        // Encrypt DEK with KEK
        const div = randomBytes(12);
        const dekCipher = createCipheriv('aes-256-gcm', this.kek, div);
        const dk = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
        const dat = dekCipher.getAuthTag();

        const payload: EncryptedPayload = {
            ct: ct.toString('hex'),
            iv: iv.toString('hex'),
            at: at.toString('hex'),
            dk: dk.toString('hex'),
            div: div.toString('hex'),
            dat: dat.toString('hex'),
        };

        return 'v1:' + Buffer.from(JSON.stringify(payload)).toString('base64');
    }

    /**
     * Decrypt a value produced by encrypt().
     */
    decrypt(stored: string): string {
        if (!stored.startsWith('v1:')) {
            throw new Error('Unknown encryption format');
        }

        const payload: EncryptedPayload = JSON.parse(
            Buffer.from(stored.slice(3), 'base64').toString('utf8'),
        );

        // Decrypt DEK with KEK
        const dekDecipher = createDecipheriv(
            'aes-256-gcm',
            this.kek,
            Buffer.from(payload.div, 'hex'),
        );
        dekDecipher.setAuthTag(Buffer.from(payload.dat, 'hex'));
        const dek = Buffer.concat([
            dekDecipher.update(Buffer.from(payload.dk, 'hex')),
            dekDecipher.final(),
        ]);

        // Decrypt field value with DEK
        const decipher = createDecipheriv(
            'aes-256-gcm',
            dek,
            Buffer.from(payload.iv, 'hex'),
        );
        decipher.setAuthTag(Buffer.from(payload.at, 'hex'));

        return Buffer.concat([
            decipher.update(Buffer.from(payload.ct, 'hex')),
            decipher.final(),
        ]).toString('utf8');
    }

    /** Safe masked value for logs — raw values must never appear in logs */
    mask(value: string): string {
        if (value.length <= 4) return '****';
        return value.slice(0, 3) + '****' + value.slice(-4);
    }
}