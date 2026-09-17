import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateKnowledgeEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  category!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content!: string;
}
