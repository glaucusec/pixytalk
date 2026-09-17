import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type {
  AgentTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from './agent-tool.js';

const CalculatePriceInputSchema = z.object({
  guestCount: z.number().int().min(1).max(1_000),
});

const CalculatePriceConfigurationSchema = z.object({
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/),
  basePriceMinor: z.number().int().min(0).max(1_000_000_000_000),
  includedGuests: z.number().int().min(0).max(1_000),
  pricePerAdditionalGuestMinor: z.number().int().min(0).max(1_000_000_000_000),
});

@Injectable()
export class CalculatePriceTool implements AgentTool {
  readonly name = 'calculate_price';
  readonly description =
    'Calculate a trusted price for a specified number of guests.';
  readonly inputSchema = CalculatePriceInputSchema;
  readonly configurationSchema = CalculatePriceConfigurationSchema;

  async execute(
    _context: ToolExecutionContext,
    rawInput: Record<string, unknown>,
    rawConfiguration: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const input = CalculatePriceInputSchema.parse(rawInput);
    const configuration =
      CalculatePriceConfigurationSchema.parse(rawConfiguration);
    const additionalGuests = Math.max(
      0,
      input.guestCount - configuration.includedGuests,
    );
    const totalMinor =
      configuration.basePriceMinor +
      additionalGuests * configuration.pricePerAdditionalGuestMinor;

    return {
      toolName: this.name,
      data: {
        guestCount: input.guestCount,
        currency: configuration.currency,
        totalMinor,
        formattedTotal: `${configuration.currency} ${(totalMinor / 100).toFixed(2)}`,
        calculation: {
          basePriceMinor: configuration.basePriceMinor,
          includedGuests: configuration.includedGuests,
          additionalGuests,
          pricePerAdditionalGuestMinor:
            configuration.pricePerAdditionalGuestMinor,
        },
      },
    };
  }
}
