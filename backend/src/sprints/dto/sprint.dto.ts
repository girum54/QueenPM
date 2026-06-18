import { IsString, IsOptional, IsNotEmpty, IsInt, IsBoolean, IsDateString, Min, Max } from 'class-validator';

export class CreateSprintDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  goal?: string;

  @IsString()
  @IsOptional()
  style?: string; // free-text: "Agile Scrum", "Chaos Mode", anything

  @IsInt()
  @Min(1)
  @Max(12)
  durationWeeks: number;

  @IsDateString()
  startDate: string;
}

export class UpdateSprintDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  goal?: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  durationWeeks?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateDeliverableDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class UpdateDeliverableDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsBoolean()
  @IsOptional()
  done?: boolean;
}
