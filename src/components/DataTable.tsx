// src/components/DataTable.tsx - Enhanced table with CRUD operations
import React from 'react';
import { Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface TableColumn {
  key: string;
  title: string;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'object';
  sortable?: boolean;
  width?: string;
}

interface DataTableProps {
  data: any[];
  columns: TableColumn[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  loading?: boolean;
  searchTerm?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSearch?: (term: string) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  onView?: (record: any) => void;
  onEdit?: (record: any) => void;
  onCreate?: () => void;
  onDelete?: (record: any) => void;
  onRefresh?: () => void;
  keyField?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  totalCount,
  currentPage,
  pageSize,
  loading = false,
  searchTerm = '',
  sortColumn,
  sortDirection = 'asc',
  onSearch,
  onSort,
  onPageChange,
  onView,
  onEdit,
  onCreate,
  onDelete,
  onRefresh,
  keyField = 'id'
}) => {
  const [localSearch, setLocalSearch] = React.useState(searchTerm);
  const [selectedRows, setSelectedRows] = React.useState<Set<any>>(new Set());

  // Auto-detect column types if not provided
  const enhancedColumns = React.useMemo(() => {
    return columns.map(col => ({
      ...col,
      type: col.type || detectColumnType(data, col.key)
    }));
  }, [columns, data]);

  // Debounced search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onSearch && localSearch !== searchTerm) {
        onSearch(localSearch);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [localSearch, onSearch, searchTerm]);

  const formatCellValue = (value: any, column: TableColumn): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }

    switch (column.type) {
      case 'boolean':
        return (
          <span className={`inline-flex items-center gap-1 ${value ? 'text-green-600' : 'text-red-600'}`}>
            {value ? '✓' : '✗'} {String(value)}
          </span>
        );
      
      case 'number':
        if (column.key.toLowerCase().includes('time') || column.key.toLowerCase().includes('date')) {
          return formatTimestamp(value);
        }
        return typeof value === 'number' ? value.toLocaleString() : value;
      
      case 'date':
        return formatTimestamp(value);
      
      case 'object':
        const preview = JSON.stringify(value).substring(0, 50);
        return (
          <button
            className="text-blue-600 hover:text-blue-800 cursor-pointer text-left"
            onClick={() => onView && onView({ [column.key]: value })}
            title="Click to view full object"
          >
            {preview}{preview.length >= 50 ? '...' : ''}
          </button>
        );
      
      default:
        const strValue = String(value);
        if (strValue.length > 100) {
          return (
            <span title={strValue} className="cursor-help">
              {strValue.substring(0, 100)}...
            </span>
          );
        }
        return strValue;
    }
  };

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    const newDirection = sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnKey, newDirection);
  };

  const handleSelectRow = (record: any) => {
    const key = record[keyField] || record;
    const newSelected = new Set(selectedRows);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      const allKeys = data.map(record => record[keyField] || record);
      setSelectedRows(new Set(allKeys));
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const startRecord = currentPage * pageSize + 1;
  const endRecord = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header with search and actions */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search in table..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-80"
              />
            </div>
            
            {selectedRows.size > 0 && (
              <span className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                {selectedRows.size} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onCreate && (
              <button
                onClick={onCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                <Plus className="w-4 h-4" />
                Add Record
              </button>
            )}
            
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRows.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              {enhancedColumns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {column.sortable !== false && sortColumn === column.key && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={enhancedColumns.length + 3} className="px-4 py-8 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={enhancedColumns.length + 3} className="px-4 py-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  No data found
                  {localSearch && (
                    <button
                      onClick={() => setLocalSearch('')}
                      className="block mx-auto mt-2 text-blue-600 hover:text-blue-800"
                    >
                      Clear search
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              data.map((record, index) => {
                const recordKey = record[keyField] || index;
                const isSelected = selectedRows.has(recordKey);
                
                return (
                  <tr
                    key={recordKey}
                    className={`hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(record)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {startRecord + index}
                    </td>
                    {enhancedColumns.map((column) => (
                      <td key={column.key} className="px-4 py-3 text-sm text-gray-900">
                        {formatCellValue(record[column.key], column)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        {onView && (
                          <button
                            onClick={() => onView(record)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(record)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Edit record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(record)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startRecord} to {endRecord} of {totalCount.toLocaleString()} results
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage === 0 || loading}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || loading}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function detectColumnType(data: any[], columnKey: string): 'string' | 'number' | 'boolean' | 'date' | 'object' {
  if (data.length === 0) return 'string';
  
  const sampleValues = data.slice(0, 10).map(item => item[columnKey]).filter(val => val != null);
  if (sampleValues.length === 0) return 'string';
  
  const firstValue = sampleValues[0];
  
  if (typeof firstValue === 'boolean') return 'boolean';
  if (typeof firstValue === 'number') return 'number';
  if (typeof firstValue === 'object') return 'object';
  
  // Check if it's a timestamp
  if (typeof firstValue === 'number' && firstValue > 1000000000) {
    return 'date';
  }
  
  return 'string';
}

function formatTimestamp(value: number): string {
  if (!value || typeof value !== 'number') return String(value);
  
  const date = value > 1000000000000 ? new Date(value) : new Date(value * 1000);
  
  if (isNaN(date.getTime())) return String(value);
  
  return date.toLocaleString();
}