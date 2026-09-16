import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CalculatePriceTool } from './calculate-price.tool.js';
import { ToolRegistryService } from './tool-registry.service.js';

describe('ToolRegistryService', () => {
  const registry = new ToolRegistryService([new CalculatePriceTool()]);
  const context = {
    organizationId: 'organization-1',
    agentId: 'agent-1',
    conversationId: 'conversation-1',
  };

  it('refuses a tool that is not enabled for the tenant agent', async () => {
    await expect(
      registry.execute(
        context,
        { name: 'calculate_price', argumentsJson: '{"guestCount":2}' },
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('parses and validates model arguments before executing a tool', async () => {
    await expect(
      registry.execute(
        context,
        { name: 'calculate_price', argumentsJson: '{"guestCount":6}' },
        [
          {
            name: 'calculate_price',
            configuration: {
              currency: 'INR',
              basePriceMinor: 10_000,
              includedGuests: 2,
              pricePerAdditionalGuestMinor: 2_500,
            },
          },
        ],
      ),
    ).resolves.toMatchObject({
      toolName: 'calculate_price',
      data: { guestCount: 6, totalMinor: 20_000 },
    });
  });

  it('rejects malformed model argument JSON', async () => {
    await expect(
      registry.execute(
        context,
        { name: 'calculate_price', argumentsJson: '{guestCount:6}' },
        [
          {
            name: 'calculate_price',
            configuration: {
              currency: 'INR',
              basePriceMinor: 10_000,
              includedGuests: 2,
              pricePerAdditionalGuestMinor: 2_500,
            },
          },
        ],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid saved tool configuration', () => {
    expect(() =>
      registry.validateConfiguration('calculate_price', {
        currency: 'rupees',
        basePriceMinor: -1,
        includedGuests: 2,
        pricePerAdditionalGuestMinor: 100,
      }),
    ).toThrow();
  });
});
