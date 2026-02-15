import { render, screen } from '@testing-library/react'
import { RecentTripsTable } from '../RecentTripsTable'
import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'admin', role: 'admin', full_name: 'Admin', is_superuser: true },
    loading: false,
  }),
}))

// Mock window.matchMedia (Ant Design requirement)
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

const mockData = [
  {
    id: '1',
    trip_number: 'TRIP-001',
    route_name: 'Lusaka - Ndola',
    status: 'In Transit',
    current_location: 'Kabwe',
    created_at: '2023-01-01T10:00:00Z',
    waybill_risk_level: 'Medium',
    waybill_rate: 5000,
    waybill_currency: 'USD',
    location_update_time: '2023-01-01T12:00:00Z',
  },
]

describe('RecentTripsTable', () => {
  it('renders table with data', () => {
    render(<RecentTripsTable data={mockData as any} />)
    expect(screen.getByText('TRIP-001')).toBeDefined()
    expect(screen.getByText('Lusaka - Ndola')).toBeDefined()
  })

  it('renders "No." and separate Trip Number / Route columns', () => {
    render(<RecentTripsTable data={mockData as any} />)
    expect(screen.getByText('No.')).toBeDefined()
    expect(screen.getByText('Trip Number')).toBeDefined()
    expect(screen.getByText('Route')).toBeDefined()
  })

  it('renders horizontal actions with row-actions class', () => {
     const { container } = render(<RecentTripsTable data={mockData as any} />)
     expect(container.getElementsByClassName('row-actions').length).toBeGreaterThan(0)
  })

  it('renders risk badge', () => {
    render(<RecentTripsTable data={mockData as any} />)
    expect(screen.getByText('Medium')).toBeDefined()
  })

  it('renders rate column for admin role', () => {
    render(<RecentTripsTable data={mockData as any} />)
    expect(screen.getByText('Rate')).toBeDefined()
    expect(screen.getByText('USD 5,000.00')).toBeDefined()
  })

  it('renders status with color', () => {
    render(<RecentTripsTable data={mockData as any} />)
    expect(screen.getByText('In Transit')).toBeDefined()
  })
})
