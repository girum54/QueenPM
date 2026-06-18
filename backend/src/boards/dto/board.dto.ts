import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  sprintId: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  name?: string; // defaults to "Sprint Board — {sprint name}" if omitted
}

export class UpdateBoardDto {
  @IsString()
  @IsOptional()
  name?: string;
}
