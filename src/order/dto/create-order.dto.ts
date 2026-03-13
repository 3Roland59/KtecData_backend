import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
    @IsString()
    @IsNotEmpty()
    network: string;

    @IsString()
    @IsNotEmpty()
    recipientNumber: string;

    @IsString()
    @IsNotEmpty()
    volume: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsOptional()
    paymentNumber?: string;

    @IsString()
    @IsOptional()
    nagonuServiceName?: string;

    @IsString()
    @IsOptional()
    nagonuNetwork?: string;

    @IsNumber()
    @IsOptional()
    nagonuOfferId?: number;

    @IsString()
    @IsOptional()
    nagonuPackageType?: string;
}
