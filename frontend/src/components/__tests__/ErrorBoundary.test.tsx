import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError = () => {
  throw new Error('Test error');
};

// Component that works fine
const WorkingComponent = () => <div>Working component</div>;

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Working component')).toBeDefined();
  });

  it('catches errors and displays error UI', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    // Should show error message
    const bodyText = document.body.textContent || '';
    expect(bodyText.toLowerCase()).toContain('error' || 'wrong' || 'issue');
    
    spy.mockRestore();
  });
});
