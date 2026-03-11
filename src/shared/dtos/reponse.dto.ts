import { IsObject, IsString } from "class-validator";

export class SuccessResponseDto<T = any> {
  @IsString()
  message: string;

  @IsObject()
  data: T | null;

  @IsString()
  status: boolean;
}

