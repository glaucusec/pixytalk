import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ConfigureWhatsAppAccountDto {
  @IsString()
  @Matches(/^\d{5,64}$/)
  phoneNumberId!: string;

  @IsString()
  @Matches(/^\d{5,64}$/)
  wabaId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  displayPhoneNumber?: string;
}
