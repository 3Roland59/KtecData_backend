import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderDocument } from './schemas/order.schema';
import { v4 as uuidv4 } from 'uuid';
import { PaystackService } from '../shared/services/paystack.service';
import { DataPurchaseService } from '../shared/services/data-purchase.service';
import { SmsService } from '../shared/services/sms.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly paystackService: PaystackService,
    private readonly dataPurchaseService: DataPurchaseService,
    private readonly smsService: SmsService,
  ) { }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const reference = `KTEC-${uuidv4().split('-')[0].toUpperCase()}`;
    const newOrder = new this.orderModel({
      ...createOrderDto,
      reference,
      status: 'Pending',
    });
    return newOrder.save();
  }

  async verifyAndProcess(reference: string): Promise<Order> {
    const order = await this.findByReference(reference);

    if (order.status !== 'Pending') {
      this.logger.warn(`Order ${reference} is already processed or being processed. Current status: ${order.status}`);
      return order;
    }

    // 1. Verify Payment with Paystack
    const verificationData = await this.paystackService.verifyTransaction(reference);
    if (!verificationData.status || verificationData.data.status !== 'success') {
      this.logger.error(`Payment verification failed for ${reference}`);
      throw new InternalServerErrorException('Payment verification failed');
    }

    // Extract payment number from Paystack
    const paystackPhone = verificationData.data.authorization?.mobile_money_number;
    if (paystackPhone) {
      order.paymentNumber = paystackPhone;
    }

    // Update payment status from Paystack
    order.paymentStatus = (verificationData.data.status || 'success').charAt(0).toUpperCase() + (verificationData.data.status || 'success').slice(1);

    // Update status to Processing
    order.status = 'Processing';
    await (order as any).save();

    // 2. Initiate Data Purchase
    const purchaseResult = await this.dataPurchaseService.initiatePurchase(order);
    if (purchaseResult.success) {
      order.status = 'Completed';
      order.externalOrderId = purchaseResult.externalOrderId;
      await (order as any).save();

      // 3. Send SMS Notification
      if (order.paymentNumber) {
        const smsMessage = `Payment for ${order.volume} ${order.network.toUpperCase()} bundle for recipient ${order.recipientNumber} received and is being processed. Order ID: ${order.reference}. Thank you for choosing KtecData.`;
        try {
          await this.smsService.sendSms(order.paymentNumber, smsMessage);
        } catch (smsError) {
          this.logger.error(`Failed to send SMS for order ${reference}: ${smsError.message}`);
          // We don't throw here as the purchase was successful
        }
      } else {
        this.logger.warn(`No payment number found for order ${reference}, skipping SMS.`);
      }

      return order;
    }
    else {
      order.status = 'Failed';
      await (order as any).save();
      throw new InternalServerErrorException(purchaseResult.message || 'Data purchase initiation failed');
    }
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec();
  }

  async findOne(reference: string): Promise<Order> {
    const order = await this.orderModel.findOne({ reference }).exec();
    if (!order) {
      throw new NotFoundException(`Order with reference ${reference} not found`);
    }
    return order;
  }

  async findByReference(reference: string): Promise<Order> {
    return this.findOne(reference);
  }

  async updateStatus(reference: string, status: string): Promise<Order> {
    const order = await this.orderModel.findOneAndUpdate(
      { reference },
      { status },
      { new: true },
    ).exec();
    if (!order) {
      throw new NotFoundException(`Order with reference ${reference} not found`);
    }
    return order;
  }

  async findByRecipient(recipientNumber: string, page: number = 1, limit: number = 2): Promise<{ orders: Order[], total: number }> {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel.find({ recipientNumber })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ recipientNumber }).exec()
    ]);

    return { orders, total };
  }

  async remove(id: string): Promise<any> {
    return this.orderModel.findByIdAndDelete(id).exec();
  }
}
