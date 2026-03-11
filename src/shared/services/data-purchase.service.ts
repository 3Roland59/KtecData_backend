import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../../order/schemas/order.schema';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DataPurchaseService {
    private readonly logger = new Logger(DataPurchaseService.name);

    async initiatePurchase(order: Order): Promise<{ success: boolean; externalOrderId?: string; message?: string }> {
        this.logger.log(`Initiating data purchase for ${order.recipientNumber} - ${order.network} ${order.volume}`);

        // Simulate external API call
        return new Promise((resolve) => {
            setTimeout(() => {
                const isSuccessful = true; // Simulate success
                const externalOrderId = `EXT-${uuidv4().split('-')[0].toUpperCase()}`;

                if (isSuccessful) {
                    this.logger.log(`Data purchase successful: ${externalOrderId}`);
                    resolve({ success: true, externalOrderId });
                } else {
                    this.logger.error('Data purchase failed');
                    resolve({ success: false, message: 'External API failure' });
                }
            }, 2000);
        });
    }
}
