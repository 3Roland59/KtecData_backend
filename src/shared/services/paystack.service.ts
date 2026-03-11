import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PaystackService {
    private readonly logger = new Logger(PaystackService.name);
    private readonly secretKey: string | undefined;
    private readonly baseUrl = 'https://api.paystack.co';

    constructor(private configService: ConfigService) {
        this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!this.secretKey) {
            this.logger.warn('PAYSTACK_SECRET_KEY is not defined in environment variables');
        }
    }

    async verifyTransaction(reference: string): Promise<any> {
        if (!this.secretKey) {
            throw new InternalServerErrorException('Paystack secret key is not configured');
        }

        try {
            const response = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            this.logger.error(`Error verifying transaction ${reference}: ${error.message}`);
            if (error.response) {
                this.logger.error(`Paystack Error Response: ${JSON.stringify(error.response.data)}`);
            }
            throw new InternalServerErrorException('Failed to verify transaction with Paystack');
        }
    }
}
