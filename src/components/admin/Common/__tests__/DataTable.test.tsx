import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import DataTable from '../DataTable';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Trash2: () => <div data-testid="delete-icon">Delete</div>,
  ChevronLeft: () => <div data-testid="chevron-left">←</div>,
  ChevronRight: () => <div data-testid="chevron-right">→</div>,
  ArrowUpDown: () => <div data-testid="sort-icon">↕</div>
}));

interface TestData {
  id: string;
  name: string;
  email: string;
  age: number;
}

const mockData: TestData[] = [
  { id: '1', name: 'João Silva', email: 'joao@email.com', age: 30 },
  { id: '2', name: 'Maria Santos', email: 'maria@email.com', age: 25 },
  { id: '3', name: 'Pedro Oliveira', email: 'pedro@email.com', age: 35 }
];

const mockColumns = [
  {
    key: 'name' as keyof TestData,
    title: 'Nome',
    sortable: true,
    searchable: true
  },
  {
    key: 'email' as keyof TestData,
    title: 'Email',
    sortable: true,
    searchable: true
  },
  {
    key: 'age' as keyof TestData,
    title: 'Idade',
    sortable: true,
    searchable: true,
    render: (value: number) => `${value} anos`
  }
];

describe('DataTable Component', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render table with data', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Idade')).toBeInTheDocument();

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@email.com')).toBeInTheDocument();
    expect(screen.getByText('30 anos')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={true}
      />
    );

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
  });

  it('should render search input when searchable', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
      />
    );

    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('should filter data based on search', async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar...');
    await user.type(searchInput, 'João');

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButtons = screen.getAllByTestId('edit-icon');
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockData[0]);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByTestId('delete-icon');
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith(mockData[0]);
  });

  it('should sort data when column header is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    );

    const nameHeader = screen.getByText('Nome');
    await user.click(nameHeader);

    // Check if data is sorted (João should come before Maria alphabetically)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('João Silva');
  });

  it('should render pagination when provided', () => {
    const pagination = {
      page: 1,
      pageSize: 10,
      total: 30,
      onPageChange: mockOnPageChange
    };

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        pagination={pagination}
      />
    );

    expect(screen.getByText('de 30 itens')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('should call onPageChange when pagination buttons are clicked', async () => {
    const user = userEvent.setup();
    const pagination = {
      page: 1,
      pageSize: 10,
      total: 30,
      onPageChange: mockOnPageChange
    };

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        pagination={pagination}
      />
    );

    const nextButton = screen.getByTestId('chevron-right').closest('button');
    if (nextButton) {
      await user.click(nextButton);
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    }
  });

  it('should disable pagination buttons appropriately', () => {
    const pagination = {
      page: 1,
      pageSize: 10,
      total: 30,
      onPageChange: mockOnPageChange
    };

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        pagination={pagination}
      />
    );

    const prevButton = screen.getByTestId('chevron-left').closest('button');
    expect(prevButton).toBeDisabled();
  });

  it('should render custom cell content', () => {
    const customColumns = [
      {
        key: 'name' as keyof TestData,
        title: 'Nome',
        render: (value: string, item: TestData) => (
          <div data-testid="custom-cell">
            <strong>{value}</strong> ({item.age})
          </div>
        )
      }
    ];

    render(
      <DataTable
        data={mockData}
        columns={customColumns}
      />
    );

    expect(screen.getByTestId('custom-cell')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('should handle empty search results', async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar...');
    await user.type(searchInput, 'NonExistentName');

    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
  });

  it('should clear search when input is cleared', async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar...');

    // Type search term
    await user.type(searchInput, 'João');
    expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument();

    // Clear search
    await user.clear(searchInput);
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('should not render action buttons when handlers are not provided', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    );

    expect(screen.queryByTestId('edit-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-icon')).not.toBeInTheDocument();
  });

  it('should handle sorting in both directions', async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    );

    const ageHeader = screen.getByText('Idade');

    // First click - ascending
    await user.click(ageHeader);
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('25 anos'); // Maria (youngest)

    // Second click - descending
    await user.click(ageHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('35 anos'); // Pedro (oldest)
  });
});