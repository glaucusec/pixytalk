import { describe, expect, it } from 'vitest';
import { createAgentResponseSchema } from './ai.types.js';

describe('createAgentResponseSchema', () => {
  it('forbids tool decisions when the tenant has no enabled tools', () => {
    const schema = createAgentResponseSchema([]);

    expect(
      schema.safeParse({
        action: 'TOOL',
        message: null,
        intent: 'connect_to_agent',
        handoffReason: null,
        toolCall: {
          name: 'connect_to_agent',
          argumentsJson: '{}',
        },
      }).success,
    ).toBe(false);
  });

  it('accepts only enabled tool names', () => {
    const schema = createAgentResponseSchema([
      {
        name: 'calculate_price',
        description: 'Calculate a trusted price',
        inputSchema: { type: 'object' },
      },
    ]);

    expect(
      schema.safeParse({
        action: 'TOOL',
        message: null,
        intent: 'pricing',
        handoffReason: null,
        toolCall: {
          name: 'calculate_price',
          argumentsJson: '{"guestCount":4}',
        },
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        action: 'TOOL',
        message: null,
        intent: 'pricing',
        handoffReason: null,
        toolCall: { name: 'invented_tool', argumentsJson: '{}' },
      }).success,
    ).toBe(false);
  });

  it('keeps handoff separate from tool execution', () => {
    const schema = createAgentResponseSchema([]);

    expect(
      schema.safeParse({
        action: 'HANDOFF',
        message: 'A team member will help you now.',
        intent: 'connect_to_agent',
        handoffReason: 'customer_requested_human',
        toolCall: null,
      }).success,
    ).toBe(true);
  });
});
