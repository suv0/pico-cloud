import { describe, it, expect } from 'vitest';
import { assertValidTransition, isTerminalStatus, isInProgressStatus } from '@/lib/provisioning/fsm';

describe('assertValidTransition', () => {
  it('allows PENDING → PROVISIONING', () => {
    expect(() => assertValidTransition('PENDING', 'PROVISIONING')).not.toThrow();
  });

  it('allows PROVISIONING → ACTIVE', () => {
    expect(() => assertValidTransition('PROVISIONING', 'ACTIVE')).not.toThrow();
  });

  it('allows PROVISIONING → FAILED', () => {
    expect(() => assertValidTransition('PROVISIONING', 'FAILED')).not.toThrow();
  });

  it('allows PENDING → FAILED (error recovery)', () => {
    expect(() => assertValidTransition('PENDING', 'FAILED')).not.toThrow();
  });

  it('rejects PENDING → ACTIVE (skipping PROVISIONING)', () => {
    expect(() => assertValidTransition('PENDING', 'ACTIVE')).toThrow('Invalid FSM transition');
  });

  it('rejects ACTIVE → PENDING (backward transition)', () => {
    expect(() => assertValidTransition('ACTIVE', 'PENDING')).toThrow('Invalid FSM transition');
  });

  it('rejects ACTIVE → ACTIVE (self-loop)', () => {
    expect(() => assertValidTransition('ACTIVE', 'ACTIVE')).toThrow('Invalid FSM transition');
  });

  it('allows FAILED → PENDING (retry path)', () => {
    expect(() => assertValidTransition('FAILED', 'PENDING')).not.toThrow();
  });

  it('rejects FAILED → PROVISIONING (must go through PENDING)', () => {
    expect(() => assertValidTransition('FAILED', 'PROVISIONING')).toThrow('Invalid FSM transition');
  });

  it('allows ACTIVE → SUSPENDED', () => {
    expect(() => assertValidTransition('ACTIVE', 'SUSPENDED')).not.toThrow();
  });

  it('allows SUSPENDED → ACTIVE', () => {
    expect(() => assertValidTransition('SUSPENDED', 'ACTIVE')).not.toThrow();
  });

  it('allows ACTIVE → TERMINATED', () => {
    expect(() => assertValidTransition('ACTIVE', 'TERMINATED')).not.toThrow();
  });

  it('allows SUSPENDED → TERMINATED', () => {
    expect(() => assertValidTransition('SUSPENDED', 'TERMINATED')).not.toThrow();
  });

  it('allows FAILED → TERMINATED', () => {
    expect(() => assertValidTransition('FAILED', 'TERMINATED')).not.toThrow();
  });

  it('rejects TERMINATED → ACTIVE', () => {
    expect(() => assertValidTransition('TERMINATED', 'ACTIVE')).toThrow('Invalid FSM transition');
  });

  it('rejects SUSPENDED → PENDING', () => {
    expect(() => assertValidTransition('SUSPENDED', 'PENDING')).toThrow('Invalid FSM transition');
  });

  it('rejects SUSPENDED → PROVISIONING', () => {
    expect(() => assertValidTransition('SUSPENDED', 'PROVISIONING')).toThrow('Invalid FSM transition');
  });
});

describe('isTerminalStatus', () => {
  it('ACTIVE is not terminal (can transition to SUSPENDED or TERMINATED)', () => {
    expect(isTerminalStatus('ACTIVE')).toBe(false);
  });

  it('TERMINATED is terminal', () => {
    expect(isTerminalStatus('TERMINATED')).toBe(true);
  });

  it('FAILED is not terminal (retry allowed)', () => {
    expect(isTerminalStatus('FAILED')).toBe(false);
  });

  it('PENDING is not terminal', () => {
    expect(isTerminalStatus('PENDING')).toBe(false);
  });

  it('PROVISIONING is not terminal', () => {
    expect(isTerminalStatus('PROVISIONING')).toBe(false);
  });

  it('SUSPENDED is not terminal (can resume or terminate)', () => {
    expect(isTerminalStatus('SUSPENDED')).toBe(false);
  });
});

describe('isInProgressStatus', () => {
  it('PENDING is in-progress', () => {
    expect(isInProgressStatus('PENDING')).toBe(true);
  });

  it('PROVISIONING is in-progress', () => {
    expect(isInProgressStatus('PROVISIONING')).toBe(true);
  });

  it('ACTIVE is not in-progress', () => {
    expect(isInProgressStatus('ACTIVE')).toBe(false);
  });

  it('SUSPENDED is not in-progress', () => {
    expect(isInProgressStatus('SUSPENDED')).toBe(false);
  });

  it('TERMINATED is not in-progress', () => {
    expect(isInProgressStatus('TERMINATED')).toBe(false);
  });
});
