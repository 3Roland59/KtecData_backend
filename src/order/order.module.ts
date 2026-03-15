import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { Sales, SalesSchema } from './schemas/sales.schema';
import { SharedModule } from '../shared/shared.module';

import { PackagesModule } from '../packages/packages.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }, { name: Sales.name, schema: SalesSchema }]),
    SharedModule,
    PackagesModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule { }
