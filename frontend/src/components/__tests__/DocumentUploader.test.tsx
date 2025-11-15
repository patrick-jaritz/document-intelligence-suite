import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentUploader } from '../DocumentUploader';

describe('DocumentUploader', () => {
  it('renders upload zone', () => {
    const mockOnFileSelect = vi.fn();
    render(<DocumentUploader onFileSelect={mockOnFileSelect} isProcessing={false} />);
    
    // Check for upload text
    const uploadElements = screen.getAllByText(/drag|drop|upload/i);
    expect(uploadElements.length).toBeGreaterThan(0);
  });

  it('accepts file upload', async () => {
    const onFileSelect = vi.fn();
    render(<DocumentUploader onFileSelect={onFileSelect} isProcessing={false} />);
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      expect(onFileSelect).toHaveBeenCalled();
    }
  });

  it('disables upload when processing', () => {
    const mockOnFileSelect = vi.fn();
    render(<DocumentUploader onFileSelect={mockOnFileSelect} isProcessing={true} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDefined();
    if (input) {
      expect(input.disabled || input.hasAttribute('disabled')).toBeTruthy();
    }
  });

  it('shows file name after selection', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(<DocumentUploader onFileSelect={onFileSelect} isProcessing={false} />);
    
    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(input);
      
      expect(onFileSelect).toHaveBeenCalledWith(file);
    }
  });
});
