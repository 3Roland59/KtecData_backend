import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    SharedModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule { }
