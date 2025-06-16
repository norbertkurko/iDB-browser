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
  recordCount: number;
}

const Popup: React.FC = () => {
  const [databases, setDatabases] = React.useState<DatabaseInfo[]>([]);
  const [stores, setStores] = React.useState<StoreInfo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expandedDb, setExpandedDb] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');

  const sendMessage = async (message: any): Promise<any> => {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }

      console.log('Popup sending message:', message);
      
      // Inject content script if needed
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-script.js']
        });
        console.log('Content script injected successfully');
      } catch (injectError) {
        console.log('Content script might already be injected:', injectError);
      }

      // Wait a bit for content script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await chrome.tabs.sendMessage(tab.id, message);
      console.log('Popup received response:', response);
      
      if (!response) {
        throw new Error('No response from content script. Try refreshing the page.');
      }
      
      return response;
    } catch (error) {
      console.error('Message sending failed:', error);
      throw error;
    }
  };

  const loadDatabases = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await sendMessage({ action: 'GET_DATABASES' });
      
      if (response && response.success) {
        console.log('Databases loaded:', response.data);
        
        const formattedDatabases = (response.data || []).map((db: any) => ({
          name: db.name || 'Unknown',
          version: db.version || 1,
          stores: Array.isArray(db.stores) ? db.stores : [],
          storeCount: Array.isArray(db.stores) ? db.stores.length : 0
        }));
        
        setDatabases(formattedDatabases);
      } else {
        const errorMsg = response?.error || 'Failed to load databases';
        console.error('Database loading failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Failed to load databases:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('Could not establish connection')) {
        setError('Cannot connect to page. Please refresh the page and try again.');
      } else if (errorMessage.includes('Content Security Policy')) {
        setError('Page security prevents extension access. Try a different page.');
      } else {
        setError(`Communication error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async (dbName: string) => {
    setError('');
    
    try {
      console.log('Loading stores for database:', dbName);
      
      const response = await sendMessage({ 
        action: 'GET_DATABASE_STORES',
        dbName 
      });
      
      if (response && response.success) {
        console.log('Stores loaded:', response.data);
        
        const formattedStores = (response.data || []).map((store: any) => ({
          name: store.name || 'Unknown',
          recordCount: typeof store.recordCount === 'number' ? store.recordCount : 0
        }));
        
        setStores(formattedStores);
      } else {
        console.error('Failed to load stores:', response);
        setStores([]);
        setError(response?.error || 'Failed to load tables');
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
      setStores([]);
      setError('Failed to load table information');
    }
  };

  const toggleDatabase = async (dbName: string) => {
    if (expandedDb === dbName) {
      setExpandedDb('');
      setStores([]);
    } else {
      setExpandedDb(dbName);
      await loadStores(dbName);
    }
  };

  const openDevTools = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // Show a simple alert instead of injecting complex scripts
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'SHOW_DEVTOOLS_NOTIFICATION' 
        }).catch(() => {
          // If message fails, just close the popup
          console.log('Could not send notification');
        });
      }
    });
    
    window.close();
  };

  const retryConnection = async () => {
    setError('');
    await loadDatabases();
  };

  React.useEffect(() => {
    loadDatabases();
  }, []);

  const totalTables = databases.reduce((sum, db) => sum + (db.storeCount || 0), 0);
  const totalRecords = stores.reduce((sum, store) => sum + (store.recordCount || 0), 0);

  return (
    <div style={{ 
      width: '350px', 
      maxHeight: '600px',
      padding: '0',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#ffffff',
      border: '1px solid #e1e5e9',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px', marginRight: '8px' }}>🗄️</span>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            IndexedDB Explorer
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
          Browse and manage IndexedDB databases
        </p>
      </div>

      {/* Stats */}
      <div style={{ 
        padding: '16px 20px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#495057' }}>
              {databases.length}
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Database{databases.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#495057' }}>
              {totalTables}
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Table{totalTables !== 1 ? 's' : ''}
            </div>
          </div>
          {expandedDb && stores.length > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#495057' }}>
                {totalRecords.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Record{totalRecords !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          fontSize: '12px',
          borderBottom: '1px solid #f5c6cb'
        }}>
          <div style={{ marginBottom: '8px' }}>⚠️ {error}</div>
          <button 
            onClick={retryConnection}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              border: '1px solid #721c24',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: '#721c24',
              cursor: 'pointer'
            }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ 
        maxHeight: '400px',
        overflowY: 'auto',
        padding: '16px 20px'
      }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '40px 0',
            color: '#6c757d'
          }}>
            <div>🔄 Loading databases...</div>
          </div>
        ) : databases.length === 0 && !error ? (
          <div style={{ 
            textAlign: 'center',
            padding: '40px 0',
            color: '#6c757d'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>
              No IndexedDB databases found
            </p>
            <p style={{ margin: 0, fontSize: '12px' }}>
              This page doesn't use IndexedDB or databases are not accessible.
            </p>
          </div>
        ) : !error && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#495057' }}>
                Databases
              </h3>
              <button 
                onClick={loadDatabases}
                disabled={loading}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor: loading ? '#f8f9fa' : 'white',
                  color: '#6c757d'
                }}
              >
                {loading ? '🔄' : '🔄 Refresh'}
              </button>
            </div>
            
            {databases.map((db) => (
              <div key={db.name} style={{
                marginBottom: '8px',
                border: '1px solid #e9ecef',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div
                  onClick={() => toggleDatabase(db.name)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    backgroundColor: expandedDb === db.name ? '#e3f2fd' : 'white',
                    borderBottom: expandedDb === db.name ? '1px solid #e9ecef' : 'none',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#343a40' }}>
                        {db.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        v{db.version} • {db.storeCount} table{db.storeCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#6c757d',
                      transform: expandedDb === db.name ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}>
                      ▶
                    </span>
                  </div>
                </div>
                
                {expandedDb === db.name && (
                  <div style={{ backgroundColor: '#f8f9fa' }}>
                    {stores.length > 0 ? (
                      stores.map((store) => (
                        <div key={store.name} style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          borderBottom: '1px solid #e9ecef',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ color: '#495057' }}>📊 {store.name}</span>
                          <span style={{ color: '#6c757d' }}>
                            {store.recordCount.toLocaleString()} records
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        color: '#6c757d',
                        textAlign: 'center'
                      }}>
                        Loading tables...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e9ecef'
      }}>
        <button 
          onClick={openDevTools}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            marginBottom: '8px'
          }}
        >
          🔧 Open Advanced Panel
        </button>
        
        <div style={{ 
          fontSize: '11px', 
          color: '#6c757d',
          textAlign: 'center'
        }}>
          💡 Use F12 → "IndexedDB Explorer" tab for full features
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}