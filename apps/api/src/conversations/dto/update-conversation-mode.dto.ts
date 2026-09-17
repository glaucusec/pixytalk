import { IsEnum } from 'class-validator';
import { ConversationMode } from '../../generated/prisma/enums.js';

export class UpdateConversationModeDto {
  @IsEnum(ConversationMode)
  mode!: ConversationMode;
}
