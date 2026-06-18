import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsBoolean()
  @IsOptional()
  aiActive?: boolean;
}

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsBoolean()
  @IsOptional()
  aiActive?: boolean;
}
