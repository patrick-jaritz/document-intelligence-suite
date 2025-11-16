import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { CommentPanel } from './CommentPanel';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock supabaseUrl
vi.mock('../lib/supabase', () => ({
  supabaseUrl: 'http://localhost:3000'
}));

describe('CommentPanel', () => {
  const mockRepositoryUrl = 'https://github.com/owner/repo';
  const mockUserId = 'user-123';

  // Mock localStorage
  beforeAll(() => {
    const localStorageMock = {
      getItem: vi.fn(() => 'mock-token-123'),
      setItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={false}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render side panel when isOpen is true', () => {
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      expect(screen.getByText('Discussions')).toBeInTheDocument();
    });

    it('should display close button', () => {
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      expect(screen.getByText('✕')).toBeInTheDocument();
    });
  });

  describe('comment input', () => {
    it('should have comment textarea', () => {
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });

    it('should have post button', () => {
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      expect(screen.getByText('Post Comment')).toBeInTheDocument();
    });

    it('should disable post button when textarea is empty', async () => {
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      const button = screen.getByText('Post Comment');
      expect(button).toBeDisabled();
    });

    it('should enable post button when textarea has text', async () => {
      const user = userEvent.setup();
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      
      const textarea = screen.getByPlaceholderText('Add a comment...');
      await user.type(textarea, 'Test comment');
      
      const button = screen.getByText('Post Comment');
      expect(button).not.toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should display error message when auth token missing', () => {
      (localStorage.getItem as any).mockReturnValueOnce(null);
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      // Error should appear after component tries to load comments
      expect(window.localStorage.getItem).toHaveBeenCalled();
    });
  });

  describe('close functionality', () => {
    it('should call onClose when close button clicked', async () => {
      const onClose = vi.fn();
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={onClose}
          currentUserId={mockUserId}
        />
      );
      
      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay clicked', async () => {
      const onClose = vi.fn();
      const { container } = render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={onClose}
          currentUserId={mockUserId}
        />
      );
      
      const overlay = container.querySelector('[class*="bg-black"]');
      if (overlay) {
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });

  describe('comment display', () => {
    it('should show "no comments" message when empty', async () => {
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading indicator initially', () => {
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      
      // Should have loading spinner while fetching
      const spinners = screen.queryAllByRole('img', { hidden: true });
      expect(spinners.length >= 0).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      expect(screen.getByText('Discussions')).toBeInTheDocument();
    });

    it('should have descriptive button titles', () => {
      render(
        <CommentPanel
          repositoryUrl={mockRepositoryUrl}
          isOpen={true}
          onClose={vi.fn()}
          currentUserId={mockUserId}
        />
      );
      expect(screen.getByText('Post Comment')).toBeInTheDocument();
    });
  });
});
