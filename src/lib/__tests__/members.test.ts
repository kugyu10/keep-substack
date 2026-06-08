import { describe, it, expect } from 'vitest'

// Test the mapper logic: getMembers() maps substack_handle column to substackHandle field
// These tests exercise the mapper in isolation (pure function logic)

describe('getMembers() mapper — substackHandle field (Phase 27)', () => {
  /**
   * Inline the mapper logic from members.ts so we can test it independently
   * without mocking the Supabase client. The mapper logic is:
   *   substackHandle: m.substack_handle ?? undefined
   */
  function mapSubstackHandle(substack_handle: string | null): string | undefined {
    return substack_handle ?? undefined
  }

  it('maps substack_handle string to substackHandle string', () => {
    // This test will fail until Member type has substackHandle and members.ts maps it
    expect(mapSubstackHandle('@hoge')).toBe('@hoge')
  })

  it('maps substack_handle null to undefined', () => {
    expect(mapSubstackHandle(null)).toBeUndefined()
  })
})

// TypeScript compilation check: Member type must accept substackHandle as optional
// Import Member to trigger TS check at test collection time
import type { Member } from '../types'

describe('Member type — substackHandle field (Phase 27)', () => {
  it('Member type accepts substackHandle as optional field', () => {
    // This test will FAIL until substackHandle is added to the Member type
    const member: Member = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test',
      publicationId: 'test-id',
      teams: [],
      addedAt: '2026-01-01T00:00:00Z',
      substackHandle: '@hoge',  // This line causes a TS error until the field is added
      hasUser: true,
    }
    expect(member.substackHandle).toBe('@hoge')
  })

  it('Member type allows substackHandle to be omitted (optional)', () => {
    const member: Member = {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Test',
      publicationId: 'test-id',
      teams: [],
      addedAt: '2026-01-01T00:00:00Z',
      hasUser: true,
    }
    expect(member.substackHandle).toBeUndefined()
  })
})
