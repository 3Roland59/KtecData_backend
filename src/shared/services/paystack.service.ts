import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PaystackService {
    private readonly logger = new Logger(PaystackService.name);
    private readonly secretKey: string | undefined;
    private readonly baseUrl = 'https://api.paystack.co';

    constructor(private configService: ConfigService) {
        const rawKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        this.secretKey = rawKey ? rawKey.trim() : undefined;

        if (!this.secretKey) {
            this.logger.warn('PAYSTACK_SECRET_KEY is not defined in environment variables');
        } else {
            const maskedKey = `${this.secretKey.substring(0, 7)}...${this.secretKey.substring(this.secretKey.length - 4)}`;
            this.logger.log(`PaystackService initialized with key: ${maskedKey} (length: ${this.secretKey.length})`);
        }
    }

    async verifyTransaction(reference: string): Promise<any> {
        if (!this.secretKey) {
            throw new InternalServerErrorException('Paystack secret key is not configured');
        }

        const trimmedReference = reference.trim();
        const url = `${this.baseUrl}/transaction/verify/${trimmedReference}`;

        this.logger.debug(`Verifying transaction at Paystack URL: ${url}`);

        try {
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            this.logger.error(`Error verifying transaction ${trimmedReference}: ${error.message}`);
            if (error.response) {
                this.logger.error(`Paystack Error Status: ${error.response.status}`);
                this.logger.error(`Paystack Error Response Data: ${JSON.stringify(error.response.data)}`);
            }
            throw new InternalServerErrorException('Failed to verify transaction with Paystack');
        }
    }
}
