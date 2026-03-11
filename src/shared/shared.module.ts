import { Module } from '@nestjs/common';
import { SmsService } from './services/sms.service';
import { PaystackService } from './services/paystack.service';
import { DataPurchaseService } from './services/data-purchase.service';

@Module({
  imports: [],
  providers: [SmsService, PaystackService, DataPurchaseService],
  exports: [SmsService, PaystackService, DataPurchaseService]
})
export class SharedModule { }
