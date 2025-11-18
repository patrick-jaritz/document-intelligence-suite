/**
 * Tests for PromptLibrary component
 * Tests prompt loading, filtering, and basic UI interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PromptLibrary } from '../PromptLibrary';
import * as promptForgeService from '../../services/promptForgeService';

// Mock the services
vi.mock('../../services/promptForgeService', () => ({
  getPrompts: vi.fn(),
  getAllTags: vi.fn(),
  getCategories: vi.fn(),
  archivePrompt: vi.fn(),
  deletePrompt: vi.fn(),
  duplicatePrompt: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('PromptLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (promptForgeService.getPrompts as any).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    });
    (promptForgeService.getAllTags as any).mockResolvedValue([]);
    (promptForgeService.getCategories as any).mockResolvedValue([]);
  });

  it('renders prompt library heading', () => {
    render(
      <MemoryRouter>
        <PromptLibrary />
      </MemoryRouter>
    );

    const heading = screen.getByText(/Prompt Library/i);
    expect(heading).toBeDefined();
  });

  it('should have search input', () => {
    render(
      <MemoryRouter>
        <PromptLibrary />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search prompts/i);
    expect(searchInput).toBeDefined();
  });

  it('should display new prompt button', () => {
    render(
      <MemoryRouter>
        <PromptLibrary />
      </MemoryRouter>
    );

    const buttons = screen.getAllByText(/New Prompt/i);
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should have filter button', () => {
    render(
      <MemoryRouter>
        <PromptLibrary />
      </MemoryRouter>
    );

    const filterButton = screen.getByText('Filters');
    expect(filterButton).toBeDefined();
  });

  it('should have sort dropdown', () => {
    render(
      <MemoryRouter>
        <PromptLibrary />
      </MemoryRouter>
    );

    const sortSelect = screen.getByDisplayValue('Recently Updated');
    expect(sortSelect).toBeDefined();
  });

  it('should display info panel on load', () => {
    render(
      <MemoryRouter>
        <PromptLibrary />
      </MemoryRouter>
    );

    const infoPanel = screen.getByText(/Welcome to PromptForge/i);
    expect(infoPanel).toBeDefined();
  });
});
