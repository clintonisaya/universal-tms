import { render, screen, waitFor } from '@testing-library/react'
import TripsPage from '../page'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User' },
    loading: false,
  }),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('TripsPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            trip_number: 'TRIP-001',
            route_name: 'Route A',
            status: 'In Transit',
            start_date: '2023-01-01',
            end_date: '2023-01-02',
          }
        ],
        count: 1
      }),
    })
  })

  it('renders table with No. column', async () => {
    render(<TripsPage />)
    await waitFor(() => expect(screen.getByText('TRIP-001')).toBeDefined())
    expect(screen.getAllByText('No.').length).toBeGreaterThan(0)
  })

  it('merges columns for density', async () => {
     render(<TripsPage />)
     await waitFor(() => expect(screen.getByText('TRIP-001')).toBeDefined())
     
     // Check if "Start Date" and "End Date" headers are gone
     // Currently they EXIST, so this should fail
     expect(screen.queryByRole('columnheader', { name: /Start Date/i })).toBeNull()
     expect(screen.queryByRole('columnheader', { name: /End Date/i })).toBeNull()
  })
})
