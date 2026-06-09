import { screen, waitFor } from '@testing-library/react'
import TripsPage from '../page'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test-utils'

// Mocks
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User' },
    loading: false,
  }),
}))

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

  it('renders the trip number column', async () => {
    renderWithProviders(<TripsPage />)
    await waitFor(() => expect(screen.getByText('TRIP-001')).toBeDefined())
    expect(screen.getByText('Trip Number')).toBeDefined()
  })

  it('renders date columns', async () => {
     renderWithProviders(<TripsPage />)
     await waitFor(() => expect(screen.getByText('TRIP-001')).toBeDefined())

     expect(screen.getByText('Start Date')).toBeDefined()
     expect(screen.getByText('End Date')).toBeDefined()
  })
})
