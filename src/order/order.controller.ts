import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':reference')
  findOne(@Param('reference') reference: string) {
    return this.orderService.findOne(reference);
  }

  @Post('verify/:reference')
  verify(@Param('reference') reference: string) {
    return this.orderService.verifyAndProcess(reference);
  }
}
