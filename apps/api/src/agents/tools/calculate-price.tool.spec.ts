import { describe, expect, it } from 'vitest';
import { CalculatePriceTool } from './calculate-price.tool.js';

describe('CalculatePriceTool', () => {
  const tool = new CalculatePriceTool();
  const context = {
    organizationId: 'organization-1',
    agentId: 'agent-1',
    conversationId: 'conversation-1',
  };
  const configuration = {
    currency: 'INR',
    basePriceMinor: 10_000,
    includedGuests: 2,
    pricePerAdditionalGuestMinor: 2_500,
  };

  it('calculates a price entirely from trusted configuration', async () => {
    await expect(
      tool.execute(context, { guestCount: 6 }, configuration),
    ).resolves.toEqual({
      toolName: 'calculate_price',
      data: {
        guestCount: 6,
        currency: 'INR',
        totalMinor: 20_000,
        formattedTotal: 'INR 200.00',
        calculation: {
          basePriceMinor: 10_000,
          includedGuests: 2,
          additionalGuests: 4,
          pricePerAdditionalGuestMinor: 2_500,
        },
      },
    });
  });

  it('rejects invalid model arguments', async () => {
    await expect(
      tool.execute(context, { guestCount: -1 }, configuration),
    ).rejects.toThrow();
  });
});
