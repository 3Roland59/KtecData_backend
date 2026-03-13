import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../order/schemas/order.schema';
import axios from 'axios';

@Injectable()
export class DataPurchaseService {
    private readonly logger = new Logger(DataPurchaseService.name);
    private readonly apiKey: string | undefined;
    private readonly baseUrl = 'https://www.nagonu.com';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('NAGONU_API_KEY');
        if (!this.apiKey) {
            this.logger.warn('NAGONU_API_KEY is not defined in environment variables');
        }
    }

    async initiatePurchase(order: Order): Promise<{ success: boolean; externalOrderId?: string; message?: string }> {
        if (!this.apiKey) {
            throw new InternalServerErrorException('Nagonu API key is not configured');
        }

        this.logger.log(`Initiating Nagonu purchase for ${order.recipientNumber} - ${order.nagonuServiceName} (Offer ID: ${order.nagonuOfferId})`);

        try {
            const payload = {
                recipient_number: order.recipientNumber,
                service_name: order.nagonuServiceName,
                network: order.nagonuNetwork,
                offer_id: order.nagonuOfferId,
            };

            const response = await axios.post(`${this.baseUrl}/api/send_order.php`, payload, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            });

            this.logger.log(`Nagonu API Response: ${JSON.stringify(response.data)}`);

            if (response.data.status === 200 || response.data.status === '200') {
                return {
                    success: true,
                    externalOrderId: response.data.reference_id || response.data.order_id,
                    message: response.data.message
                };
            } else {
                this.logger.error(`Nagonu purchase failed: ${response.data.message}`);
                return {
                    success: false,
                    message: response.data.message || 'Nagonu API error'
                };
            }
        } catch (error: any) {
            this.logger.error(`Error with Nagonu API: ${error.message}`);
            if (error.response) {
                this.logger.error(`Nagonu Error Data: ${JSON.stringify(error.response.data)}`);
            }
            return {
                success: false,
                message: 'Failed to communicate with Nagonu API'
            };
        }
    }

    async checkOrderStatus(externalOrderId: string, type: string): Promise<string> {
        if (!this.apiKey) {
            this.logger.warn('Nagonu API key is missing. Skipping status check.');
            return 'Processing';
        }

        const endpoint = type === 'bigtime' ? '/api/response_big_time.php' : '/api/response_regular.php';
        
        try {
            const response = await axios.get(`${this.baseUrl}${endpoint}?reference_id=${externalOrderId}`, {
                headers: { 'x-api-key': this.apiKey },
                timeout: 30000,
            });

            this.logger.log(`Nagonu Status Check [${externalOrderId}]: ${JSON.stringify(response.data)}`);

            if (response.data.status === 200 || response.data.status === '200') {
                return response.data.data?.order_status || 'Processing';
            }

            // Sometimes the API returns 101/102 etc. Let's keep it Processing unless explicitly Delivered
            return 'Processing';
        } catch (error: any) {
            this.logger.error(`Error checking Nagonu status for ${externalOrderId}: ${error.message}`);
            return 'Processing';
        }
    }
}
