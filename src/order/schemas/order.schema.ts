import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
    @Prop({ required: true })
    network: string;

    @Prop({ required: true })
    recipientNumber: string;

    @Prop({ required: true })
    volume: string;

    @Prop({ required: true })
    amount: number;

    @Prop()
    paymentNumber?: string;

    @Prop()
    externalOrderId?: string;

    @Prop({ default: 'Pending' })
    status: string;

    @Prop({ required: true, unique: true })
    reference: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
