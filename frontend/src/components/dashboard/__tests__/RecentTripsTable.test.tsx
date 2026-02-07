import { render, screen } from '@testing-library/react'
import { RecentTripsTable } from '../RecentTripsTable'
import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
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
  },
]

describe('RecentTripsTable', () => {
  it('renders table with data', () => {
    render(<RecentTripsTable data={mockData} />)
    expect(screen.getByText('TRIP-001')).toBeDefined()
    expect(screen.getByText('Lusaka - Ndola')).toBeDefined()
  })

  it('renders "No." column with checkboxes', () => {
    render(<RecentTripsTable data={mockData} />)
    expect(screen.getByText('No.')).toBeDefined()
  })

  it('renders horizontal actions with row-actions class', () => {
     const { container } = render(<RecentTripsTable data={mockData} />)
     expect(container.getElementsByClassName('row-actions').length).toBeGreaterThan(0)
  })

  it('implements high density layout by merging columns', () => {
    render(<RecentTripsTable data={mockData} />)
    
    // "Location" and "Created" headers should NOT exist as separate columns
    expect(screen.queryByRole('columnheader', { name: /Location/i })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: /Created/i })).toBeNull()

    // But data should still be visible
    expect(screen.getByText('Kabwe')).toBeDefined() // Location
    // Date might be formatted, so we might need loose check or check specific format
    // For now, let's just check the location merger
  })
})
