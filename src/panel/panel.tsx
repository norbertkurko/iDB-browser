// src/panel/panel.tsx - JAVÍTOTT VERZIÓ z-index és layout fix-ekkel
import React from 'react';
import { createRoot } from 'react-dom/client';

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

const Panel: React.FC = () => {
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
  
  const pageSize = 20;

  const sendMessage = async (message: any) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab');
      }
      
      console.log('Panel sending message:', message);
      const response = await chrome.tabs.sendMessage(tab.id, message);
      console.log('Panel received response:', response);
      
      if (!response) {
        throw new Error('No response received');
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
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
      console.log('Loading stores for database:', dbName);
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

  const loadTableData = async (dbName: string, storeName: string, page: number = 0, search: string = '') => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Loading table data:', dbName, storeName, { page, search });
      const response = await sendMessage({
        action: 'GET_TABLE_DATA',
        dbName,
        storeName,
        options: {
          limit: pageSize,
          offset: page * pageSize,
          search: search.trim() || undefined
        }
      });
      
      console.log('Table data loaded:', response.data);
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

  const handleSearch = React.useCallback(
    React.useMemo(
      () => {
        let timeoutId: NodeJS.Timeout;
        return (term: string) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (selectedDb && selectedStore) {
              loadTableData(selectedDb, selectedStore, 0, term);
            }
          }, 300);
        };
      },
      [selectedDb, selectedStore]
    ),
    [selectedDb, selectedStore]
  );

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
    }
  }, [selectedDb]);

  React.useEffect(() => {
    if (selectedDb && selectedStore) {
      loadTableData(selectedDb, selectedStore, 0, searchTerm);
    }
  }, [selectedDb, selectedStore]);

  React.useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, handleSearch]);

  const getColumns = (data: any[]): string[] => {
    if (data.length === 0) return [];
    
    const columnSet = new Set<string>();
    data.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(key => {
          if (typeof item[key] !== 'object' || item[key] === null) {
            columnSet.add(key);
          } else {
            columnSet.add(key); // Still show object columns but format them
          }
        });
      }
    });
    
    const columns = Array.from(columnSet);
    const priority = ['id', 'name', 'title', 'type', 'status', 'created', 'updated'];
    const prioritized = columns.filter(col => priority.includes(col.toLowerCase()));
    const others = columns.filter(col => !priority.includes(col.toLowerCase()));
    
    return [...prioritized, ...others].slice(0, 8);
  };

  const formatValue = (value: any, columnName: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span style={{ color: '#999', fontStyle: 'italic' }}>null</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <span style={{ color: value ? '#28a745' : '#dc3545' }}>
          {value ? '✓ true' : '✗ false'}
        </span>
      );
    }
    
    if (typeof value === 'number') {
      if (columnName.toLowerCase().includes('time') || columnName.toLowerCase().includes('date')) {
        if (value > 1000000000000) {
          return new Date(value).toLocaleString();
        } else if (value > 1000000000) {
          return new Date(value * 1000).toLocaleString();
        }
      }
      return value.toLocaleString();
    }
    
    if (typeof value === 'object') {
      const preview = JSON.stringify(value).substring(0, 100);
      return (
        <span 
          style={{ 
            cursor: 'pointer', 
            color: '#007bff', 
            textDecoration: 'underline' 
          }}
          title="Click to expand"
        >
          {preview}{preview.length >= 100 ? '...' : ''}
        </span>
      );
    }
    
    const strValue = String(value);
    if (strValue.length > 100) {
      return (
        <span title={strValue}>
          {strValue.substring(0, 100)}...
        </span>
      );
    }
    
    return strValue;
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif', 
      height: '100vh',
      width: '100vw',
      display: 'flex',
      backgroundColor: '#f8f9fa',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 999999, // High z-index to be above everything
      overflow: 'hidden'
    }}>
      {/* Sidebar */}
      <div style={{ 
        width: '320px', 
        borderRight: '1px solid #dee2e6',
        padding: '20px',
        backgroundColor: 'white',
        overflowY: 'auto',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#343a40' }}>
            🗄️ IndexedDB Explorer
          </h2>
          
          <button 
            onClick={loadDatabases}
            disabled={loading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              backgroundColor: loading ? '#f8f9fa' : '#007bff',
              color: loading ? '#6c757d' : 'white',
              marginBottom: '20px'
            }}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            fontSize: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #f5c6cb'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '600',
            marginBottom: '8px',
            color: '#495057'
          }}>
            Database:
          </label>
          <select 
            value={selectedDb}
            onChange={(e) => setSelectedDb(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}
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
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600',
              marginBottom: '8px',
              color: '#495057'
            }}>
              Table:
            </label>
            <select 
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Select table...</option>
              {stores.map(store => (
                <option key={store.name} value={store.name}>
                  {store.name} ({store.recordCount} records)
                </option>
              ))}
            </select>
          </div>
        )}

        {schema && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#495057' }}>
              Table Schema
            </h4>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              <div><strong>Key:</strong> {schema.keyPath ? String(schema.keyPath) : 'None'}</div>
              <div><strong>Auto Increment:</strong> {schema.autoIncrement ? 'Yes' : 'No'}</div>
              <div><strong>Indexes:</strong> {schema.indexes.length}</div>
              <div><strong>Records:</strong> {schema.recordCount.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ 
          padding: '20px',
          backgroundColor: 'white',
          borderBottom: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#343a40' }}>
                {selectedStore ? `${selectedStore}` : 'Select a table'}
              </h1>
              {selectedDb && selectedStore && (
                <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                  {selectedDb} → {totalCount.toLocaleString()} records
                  {currentPage > 0 && (
                    <span> → Page {currentPage + 1} of {totalPages}</span>
                  )}
                </p>
              )}
            </div>
            
            {selectedStore && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search in table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    width: '250px'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '200px',
              color: '#6c757d'
            }}>
              <div>🔄 Loading data...</div>
            </div>
          ) : selectedDb && selectedStore && tableData ? (
            <div>
              {tableData.length > 0 ? (
                <>
                  <div style={{ 
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6',
                    overflow: 'hidden',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '14px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          <th style={{ 
                            padding: '12px 16px', 
                            textAlign: 'left',
                            borderBottom: '2px solid #dee2e6',
                            fontWeight: '600',
                            color: '#495057',
                            width: '40px'
                          }}>
                            #
                          </th>
                          {getColumns(tableData).map(column => (
                            <th key={column} style={{ 
                              padding: '12px 16px', 
                              textAlign: 'left',
                              borderBottom: '2px solid #dee2e6',
                              fontWeight: '600',
                              color: '#495057'
                            }}>
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, index) => (
                          <tr 
                            key={index}
                            style={{ 
                              borderBottom: '1px solid #f1f3f4',
                              backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc'
                            }}
                          >
                            <td style={{ 
                              padding: '12px 16px',
                              color: '#6c757d',
                              fontSize: '12px'
                            }}>
                              {currentPage * pageSize + index + 1}
                            </td>
                            {getColumns(tableData).map(column => (
                              <td key={column} style={{ 
                                padding: '12px 16px',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                verticalAlign: 'top'
                              }}>
                                {formatValue(row[column], column)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ 
                      marginTop: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>
                        Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount.toLocaleString()} records
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => loadTableData(selectedDb, selectedStore, currentPage - 1, searchTerm)}
                          disabled={!hasPrevPage || loading}
                          style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            cursor: (!hasPrevPage || loading) ? 'not-allowed' : 'pointer',
                            backgroundColor: (!hasPrevPage || loading) ? '#f8f9fa' : 'white'
                          }}
                        >
                          ← Previous
                        </button>
                        
                        <span style={{ 
                          padding: '8px 16px',
                          fontSize: '14px',
                          color: '#6c757d'
                        }}>
                          Page {currentPage + 1} of {totalPages}
                        </span>
                        
                        <button
                          onClick={() => loadTableData(selectedDb, selectedStore, currentPage + 1, searchTerm)}
                          disabled={!hasNextPage || loading}
                          style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            cursor: (!hasNextPage || loading) ? 'not-allowed' : 'pointer',
                            backgroundColor: (!hasNextPage || loading) ? '#f8f9fa' : 'white'
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ 
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                  <h3 style={{ margin: '0 0 8px 0' }}>No data found</h3>
                  <p>This table appears to be empty or no records match your search.</p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        border: '1px solid #007bff',
                        borderRadius: '4px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center',
              padding: '80px 20px',
              color: '#6c757d'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗄️</div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>Welcome to IndexedDB Explorer!</h3>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>Select a database and table from the sidebar to view data.</p>
              <p style={{ fontSize: '14px' }}>
                {databases.length === 0 
                  ? 'No IndexedDB databases found on this page.' 
                  : `Found ${databases.length} database${databases.length !== 1 ? 's' : ''} on this page.`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Panel />);
}