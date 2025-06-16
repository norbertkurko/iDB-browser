import React from 'react';
import { createRoot } from 'react-dom/client';
import { DataTable } from '../components/DataTable';
import { ViewRecordModal, EditRecordModal, DeleteConfirmModal } from '../components/CrudModals';

interface DatabaseInfo {
  name: string;
  version: number;
  stores: string[];
  storeCount: number;
}

interface StoreInfo {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: any[];
  recordCount: number;
}

interface TableDataResponse {
  data: any[];
  totalCount: number;
  schema: StoreInfo;
}

interface TableColumn {
  key: string;
  title: string;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'object';
  sortable?: boolean;
}

const EnhancedPanel: React.FC = () => {
  const [databases, setDatabases] = React.useState<DatabaseInfo[]>([]);
  const [selectedDb, setSelectedDb] = React.useState<string>('');
  const [stores, setStores] = React.useState<StoreInfo[]>([]);
  const [selectedStore, setSelectedStore] = React.useState<string>('');
  const [tableData, setTableData] = React.useState<any[]>([]);
  const [schema, setSchema] = React.useState<StoreInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [error, setError] = React.useState<string>('');
  const [sortColumn, setSortColumn] = React.useState<string>('');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  // Modal states
  const [viewModal, setViewModal] = React.useState<{ isOpen: boolean; record: any }>({
    isOpen: false,
    record: null
  });
  const [editModal, setEditModal] = React.useState<{ isOpen: boolean; record: any; isCreating: boolean }>({
    isOpen: false,
    record: null,
    isCreating: false
  });
  const [deleteModal, setDeleteModal] = React.useState<{ isOpen: boolean; record: any }>({
    isOpen: false,
    record: null
  });

  const pageSize = 50;

  // Enhanced message sending with better error handling
  const sendMessage = async (message: any): Promise<any> => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab');
      }
      
      console.log('Panel sending message:', message);
      const response = await chrome.tabs.sendMessage(tab.id, message);
      console.log('Panel received response:', response);
      
      if (!response) {
        throw new Error('No response received from content script');
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Unknown error occurred');
      }
      
      return response;
    } catch (error) {
      console.error('Panel message error:', error);
      throw error;
    }
  };

  const loadDatabases = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await sendMessage({ action: 'GET_DATABASES' });
      const formattedDatabases = (response.data || []).map((db: any) => ({
        name: db.name || 'Unknown',
        version: db.version || 1,
        stores: Array.isArray(db.stores) ? db.stores : [],
        storeCount: Array.isArray(db.stores) ? db.stores.length : 0
      }));
      
      setDatabases(formattedDatabases);
    } catch (error) {
      console.error('Error loading databases:', error);
      setError('Failed to load databases. Make sure to refresh the page first.');
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async (dbName: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await sendMessage({ 
        action: 'GET_DATABASE_STORES', 
        dbName 
      });
      
      const formattedStores = (response.data || []).map((store: any) => ({
        name: store.name || 'Unknown',
        keyPath: store.keyPath,
        autoIncrement: store.autoIncrement || false,
        indexes: store.indexes || [],
        recordCount: typeof store.recordCount === 'number' ? store.recordCount : 0
      }));
      
      setStores(formattedStores);
    } catch (error) {
      console.error('Error loading stores:', error);
      setError('Failed to load tables for database: ' + dbName);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (
    dbName: string, 
    storeName: string, 
    page: number = 0, 
    search: string = '',
    sort?: { column: string; direction: 'asc' | 'desc' }
  ) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await sendMessage({
        action: 'GET_TABLE_DATA',
        dbName,
        storeName,
        options: {
          limit: pageSize,
          offset: page * pageSize,
          search: search.trim() || undefined,
          sortColumn: sort?.column,
          sortDirection: sort?.direction
        }
      });
      
      setTableData(response.data.data || []);
      setSchema(response.data.schema || null);
      setTotalCount(response.data.totalCount || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading table data:', error);
      setError('Failed to load data from table: ' + storeName);
      setTableData([]);
      setSchema(null);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations
  const handleCreateRecord = async (newRecord: any) => {
    if (!selectedDb || !selectedStore) return;
    
    try {
      setLoading(true);
      await sendMessage({
        action: 'CREATE_RECORD',
        dbName: selectedDb,
        storeName: selectedStore,
        record: newRecord
      });
      
      // Reload data
      await loadTableData(selectedDb, selectedStore, currentPage, searchTerm, {
        column: sortColumn,
        direction: sortDirection
      });
    } catch (error) {
      console.error('Error creating record:', error);
      setError('Failed to create record: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecord = async (updatedRecord: any) => {
    if (!selectedDb || !selectedStore) return;
    
    try {
      setLoading(true);
      await sendMessage({
        action: 'UPDATE_RECORD',
        dbName: selectedDb,
        storeName: selectedStore,
        record: updatedRecord
      });
      
      // Reload data
      await loadTableData(selectedDb, selectedStore, currentPage, searchTerm, {
        column: sortColumn,
        direction: sortDirection
      });
    } catch (error) {
      console.error('Error updating record:', error);
      setError('Failed to update record: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (record: any) => {
    if (!selectedDb || !selectedStore) return;
    
    try {
      setLoading(true);
      await sendMessage({
        action: 'DELETE_RECORD',
        dbName: selectedDb,
        storeName: selectedStore,
        record: record
      });
      
      // Reload data
      await loadTableData(selectedDb, selectedStore, currentPage, searchTerm, {
        column: sortColumn,
        direction: sortDirection
      });
    } catch (error) {
      console.error('Error deleting record:', error);
      setError('Failed to delete record: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (selectedDb && selectedStore) {
      loadTableData(selectedDb, selectedStore, 0, term, {
        column: sortColumn,
        direction: sortDirection
      });
    }
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    if (selectedDb && selectedStore) {
      loadTableData(selectedDb, selectedStore, currentPage, searchTerm, { column, direction });
    }
  };

  const handlePageChange = (page: number) => {
    if (selectedDb && selectedStore) {
      loadTableData(selectedDb, selectedStore, page, searchTerm, {
        column: sortColumn,
        direction: sortDirection
      });
    }
  };

  const refreshData = () => {
    if (selectedDb && selectedStore) {
      loadTableData(selectedDb, selectedStore, currentPage, searchTerm, {
        column: sortColumn,
        direction: sortDirection
      });
    }
  };

  // Generate table columns from data
  const generateColumns = React.useMemo((): TableColumn[] => {
    if (tableData.length === 0) return [];
    
    const columnSet = new Set<string>();
    tableData.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(key => columnSet.add(key));
      }
    });
    
    const columns = Array.from(columnSet);
    const priority = ['id', 'name', 'title', 'type', 'status', 'created', 'updated'];
    const prioritized = columns.filter(col => priority.includes(col.toLowerCase()));
    const others = columns.filter(col => !priority.includes(col.toLowerCase()));
    
    return [...prioritized, ...others].slice(0, 10).map(key => ({
      key,
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      sortable: true
    }));
  }, [tableData]);

  // Effects
  React.useEffect(() => {
    loadDatabases();
  }, []);

  React.useEffect(() => {
    if (selectedDb) {
      loadStores(selectedDb);
      setSelectedStore('');
      setTableData([]);
      setSchema(null);
      setSearchTerm('');
      setCurrentPage(0);
    }
  }, [selectedDb]);

  React.useEffect(() => {
    if (selectedDb && selectedStore) {
      loadTableData(selectedDb, selectedStore, 0, searchTerm);
    }
  }, [selectedDb, selectedStore]);

  const keyField = schema?.keyPath ? (typeof schema.keyPath === 'string' ? schema.keyPath : schema.keyPath[0]) : 'id';

  return (
    <div className="h-screen w-screen flex bg-gray-50 fixed inset-0 z-[999999]">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🗄️ IndexedDB Explorer
          </h2>
          
          <button 
            onClick={loadDatabases}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh Databases'}
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Database:
            </label>
            <select 
              value={selectedDb}
              onChange={(e) => setSelectedDb(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select database...</option>
              {databases.map(db => (
                <option key={db.name} value={db.name}>
                  {db.name} (v{db.version}, {db.storeCount} tables)
                </option>
              ))}
            </select>
          </div>

          {selectedDb && stores.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table:
              </label>
              <select 
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select table...</option>
                {stores.map(store => (
                  <option key={store.name} value={store.name}>
                    {store.name} ({store.recordCount.toLocaleString()} records)
                  </option>
                ))}
              </select>
            </div>
          )}

          {schema && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-3">Table Schema</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div><strong>Key Path:</strong> {schema.keyPath ? String(schema.keyPath) : 'None'}</div>
                <div><strong>Auto Increment:</strong> {schema.autoIncrement ? 'Yes' : 'No'}</div>
                <div><strong>Indexes:</strong> {schema.indexes.length}</div>
                <div><strong>Total Records:</strong> {schema.recordCount.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            {selectedStore ? `${selectedStore}` : 'Select a table to browse data'}
          </h1>
          {selectedDb && selectedStore && (
            <p className="text-gray-600 mt-1">
              {selectedDb} → {totalCount.toLocaleString()} records
              {currentPage > 0 && ` → Page ${currentPage + 1}`}
            </p>
          )}
        </div>

        <div className="flex-1 p-6 overflow-hidden">
          {selectedDb && selectedStore ? (
            <DataTable
              data={tableData}
              columns={generateColumns}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              loading={loading}
              searchTerm={searchTerm}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSearch={handleSearch}
              onSort={handleSort}
              onPageChange={handlePageChange}
              onView={(record) => setViewModal({ isOpen: true, record })}
              onEdit={(record) => setEditModal({ isOpen: true, record, isCreating: false })}
              onCreate={() => setEditModal({ isOpen: true, record: {}, isCreating: true })}
              onDelete={(record) => setDeleteModal({ isOpen: true, record })}
              onRefresh={refreshData}
              keyField={keyField}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">🗄️</div>
                <h3 className="text-xl font-medium mb-2">Welcome to IndexedDB Explorer!</h3>
                <p className="text-gray-600">Select a database and table from the sidebar to start browsing data.</p>
                {databases.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No IndexedDB databases found on this page.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ViewRecordModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, record: null })}
        record={viewModal.record}
        onEdit={(record) => {
          setViewModal({ isOpen: false, record: null });
          setEditModal({ isOpen: true, record, isCreating: false });
        }}
        onDelete={(record) => {
          setViewModal({ isOpen: false, record: null });
          setDeleteModal({ isOpen: true, record });
        }}
      />

      <EditRecordModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, record: null, isCreating: false })}
        record={editModal.record}
        schema={schema}
        onSave={editModal.isCreating ? handleCreateRecord : handleUpdateRecord}
        isCreating={editModal.isCreating}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, record: null })}
        record={deleteModal.record}
        onConfirm={handleDeleteRecord}
        keyField={keyField}
      />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<EnhancedPanel />);
}