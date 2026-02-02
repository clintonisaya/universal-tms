import { render, screen } from '@testing-library/react'
import { DashboardLayout } from '../DashboardLayout'
import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}))

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'testuser', role: 'admin' },
    logout: vi.fn(),
  }),
}))

// Mock window.matchMedia (Ant Design requirement)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('DashboardLayout', () => {
  it('renders children correctly', () => {
    render(<DashboardLayout><div>Test Content</div></DashboardLayout>)
    expect(screen.getByText('Test Content')).toBeDefined()
  })

  it('renders sidebar menu items', () => {
    render(<DashboardLayout><div>Test Content</div></DashboardLayout>)
    expect(screen.getByText('Fleet')).toBeDefined()
    expect(screen.getByText('Operations')).toBeDefined()
  })
})