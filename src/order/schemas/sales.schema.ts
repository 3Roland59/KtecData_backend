import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SalesDocument = Sales & Document;

@Schema({ timestamps: true })
export class Sales {
    @Prop({ required: true })
    totalSales: number;

    @Prop({ required: true })
    totalProfit: number;

    @Prop({ required: true })
    lastestOrder: string;

    @Prop({ required: true })
    salesCount: number;
}

export const SalesSchema = SchemaFactory.createForClass(Sales);

