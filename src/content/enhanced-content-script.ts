console.log('IndexedDB Explorer enhanced content script loaded');

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
  indexes: IndexInfo[];
  recordCount: number;
}

interface IndexInfo {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

interface TableDataResponse {
  data: any[];
  totalCount: number;
  schema: StoreInfo;
}

class EnhancedIndexedDBAccess {
  
  async getDatabases(): Promise<DatabaseInfo[]> {
    try {
      console.log('Getting databases...');
      const databases = await (indexedDB as any).databases() as Array<{name: string, version: number}>;
      console.log('Raw databases:', databases);
      
      const result: DatabaseInfo[] = [];
      
      for (const dbInfo of databases) {
        try {
          console.log(`Processing database: ${dbInfo.name}`);
          const db = await this.openDatabase(dbInfo.name);
          const stores = Array.from(db.objectStoreNames);
          console.log(`Database ${dbInfo.name} has stores:`, stores);
          
          result.push({
            name: dbInfo.name,
            version: dbInfo.version || 1,
            stores,
            storeCount: stores.length
          });
          
          db.close();
        } catch (error) {
          console.error(`Error accessing database ${dbInfo.name}:`, error);
          result.push({
            name: dbInfo.name,
            version: dbInfo.version || 1,
            stores: [],
            storeCount: 0
          });
        }
      }
      
      console.log('Final databases result:', result);
      return result;
    } catch (error) {
      console.error('Error getting databases:', error);
      return [];
    }
  }

  async getDatabaseStores(dbName: string): Promise<StoreInfo[]> {
    try {
      console.log(`Getting stores for database: ${dbName}`);
      const db = await this.openDatabase(dbName);
      const stores: StoreInfo[] = [];
      
      for (let i = 0; i < db.objectStoreNames.length; i++) {
        const storeName = db.objectStoreNames[i];
        console.log(`Processing store: ${storeName}`);
        
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          
          const indexes: IndexInfo[] = [];
          for (let j = 0; j < store.indexNames.length; j++) {
            const indexName = store.indexNames[j];
            const index = store.index(indexName);
            indexes.push({
              name: indexName,
              keyPath: index.keyPath,
              unique: index.unique,
              multiEntry: index.multiEntry
            });
          }
          
          const countRequest = store.count();
          const recordCount = await new Promise<number>((resolve) => {
            countRequest.onsuccess = () => {
              console.log(`Store ${storeName} has ${countRequest.result} records`);
              resolve(countRequest.result);
            };
            countRequest.onerror = () => resolve(0);
          });
          
          stores.push({
            name: storeName,
            keyPath: store.keyPath,
            autoIncrement: store.autoIncrement,
            indexes,
            recordCount
          });
          
        } catch (error) {
          console.error(`Error getting store info for ${storeName}:`, error);
          stores.push({
            name: storeName,
            keyPath: null,
            autoIncrement: false,
            indexes: [],
            recordCount: 0
          });
        }
      }
      
      db.close();
      console.log(`Stores for ${dbName}:`, stores);
      return stores;
    } catch (error) {
      console.error('Error getting database stores:', error);
      return [];
    }
  }

  async getTableData(
    dbName: string, 
    storeName: string, 
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      searchField?: string;
      sortColumn?: string;
      sortDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<TableDataResponse> {
    try {
      console.log(`Getting table data for ${dbName}.${storeName}`, options);
      const db = await this.openDatabase(dbName);
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      // Get store schema
      const indexes: IndexInfo[] = [];
      for (let i = 0; i < store.indexNames.length; i++) {
        const indexName = store.indexNames[i];
        const index = store.index(indexName);
        indexes.push({
          name: indexName,
          keyPath: index.keyPath,
          unique: index.unique,
          multiEntry: index.multiEntry
        });
      }
      
      const schema: StoreInfo = {
        name: storeName,
        keyPath: store.keyPath,
        autoIncrement: store.autoIncrement,
        indexes,
        recordCount: 0
      };
      
      const totalCount = await new Promise<number>((resolve, reject) => {
        const countRequest = store.count();
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });
      
      schema.recordCount = totalCount;
      
      // Get all data for filtering and sorting
      let allData = await new Promise<any[]>((resolve, reject) => {
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });
      
      // Apply search filter
      if (options.search && options.search.trim()) {
        const searchTerm = options.search.toLowerCase();
        const searchField = options.searchField;
        
        allData = allData.filter(record => {
          if (searchField) {
            const fieldValue = this.getNestedValue(record, searchField);
            return String(fieldValue).toLowerCase().includes(searchTerm);
          } else {
            return this.searchInAllFields(record, searchTerm);
          }
        });
      }
      
      // Apply sorting
      if (options.sortColumn) {
        allData.sort((a, b) => {
          const aValue = this.getNestedValue(a, options.sortColumn!);
          const bValue = this.getNestedValue(b, options.sortColumn!);
          
          let comparison = 0;
          if (aValue > bValue) comparison = 1;
          if (aValue < bValue) comparison = -1;
          
          return options.sortDirection === 'desc' ? -comparison : comparison;
        });
      }
      
      // Apply pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const paginatedData = allData.slice(offset, offset + limit);
      
      db.close();
      
      return {
        data: paginatedData,
        totalCount: allData.length,
        schema
      };
      
    } catch (error) {
      console.error('Error getting table data:', error);
      throw error;
    }
  }

  // CRUD Operations
  async createRecord(dbName: string, storeName: string, record: any): Promise<any> {
    try {
      console.log(`Creating record in ${dbName}.${storeName}:`, record);
      const db = await this.openDatabase(dbName);
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.add(record);
        request.onsuccess = () => {
          console.log('Record created with key:', request.result);
          resolve(request.result);
        };
        request.onerror = () => {
          console.error('Error creating record:', request.error);
          reject(request.error);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
        
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Error in createRecord:', error);
      throw error;
    }
  }

  async updateRecord(dbName: string, storeName: string, record: any): Promise<void> {
    try {
      console.log(`Updating record in ${dbName}.${storeName}:`, record);
      const db = await this.openDatabase(dbName);
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => {
          console.log('Record updated successfully');
          resolve();
        };
        request.onerror = () => {
          console.error('Error updating record:', request.error);
          reject(request.error);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
        
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Error in updateRecord:', error);
      throw error;
    }
  }

  async deleteRecord(dbName: string, storeName: string, record: any): Promise<void> {
    try {
      console.log(`Deleting record from ${dbName}.${storeName}:`, record);
      const db = await this.openDatabase(dbName);
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Try to get the key from the record
      let key = record;
      if (store.keyPath) {
        if (typeof store.keyPath === 'string') {
          key = record[store.keyPath];
        } else if (Array.isArray(store.keyPath)) {
          key = store.keyPath.map(path => record[path]);
        }
      }
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => {
          console.log('Record deleted successfully');
          resolve();
        };
        request.onerror = () => {
          console.error('Error deleting record:', request.error);
          reject(request.error);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
        
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Error in deleteRecord:', error);
      throw error;
    }
  }

  async getRecord(dbName: string, storeName: string, key: any): Promise<any> {
    try {
      console.log(`Getting record from ${dbName}.${storeName} with key:`, key);
      const db = await this.openDatabase(dbName);
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => {
          console.log('Record retrieved:', request.result);
          resolve(request.result);
        };
        request.onerror = () => {
          console.error('Error getting record:', request.error);
          reject(request.error);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('Error in getRecord:', error);
      throw error;
    }
  }

  private async openDatabase(name: string, version?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Database blocked'));
      
      request.onupgradeneeded = () => {
        // Don't do anything in upgrade - just let it complete
      };
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  }

  private searchInAllFields(obj: any, searchTerm: string): boolean {
    const searchInValue = (value: any): boolean => {
      if (value === null || value === undefined) return false;
      
      if (typeof value === 'object') {
        return Object.values(value).some(searchInValue);
      }
      
      return String(value).toLowerCase().includes(searchTerm);
    };
    
    return searchInValue(obj);
  }

  async getSampleData(dbName: string, storeName: string, sampleSize: number = 3): Promise<any[]> {
    try {
      const response = await this.getTableData(dbName, storeName, { limit: sampleSize });
      return response.data;
    } catch (error) {
      console.error('Error getting sample data:', error);
      return [];
    }
  }
}

const dbAccess = new EnhancedIndexedDBAccess();

// Enhanced message handling with CRUD operations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  (async () => {
    try {
      switch (request.action) {
        case 'GET_DATABASES':
          console.log('Processing GET_DATABASES');
          const databases = await dbAccess.getDatabases();
          sendResponse({ success: true, data: databases });
          break;
          
        case 'GET_DATABASE_STORES':
          console.log('Processing GET_DATABASE_STORES for:', request.dbName);
          if (!request.dbName) {
            sendResponse({ success: false, error: 'Database name is required' });
            return;
          }
          const stores = await dbAccess.getDatabaseStores(request.dbName);
          sendResponse({ success: true, data: stores });
          break;
          
        case 'GET_TABLE_DATA':
          console.log('Processing GET_TABLE_DATA for:', request.dbName, request.storeName);
          if (!request.dbName || !request.storeName) {
            sendResponse({ success: false, error: 'Database name and store name are required' });
            return;
          }
          const tableData = await dbAccess.getTableData(
            request.dbName, 
            request.storeName, 
            request.options || {}
          );
          sendResponse({ success: true, data: tableData });
          break;
          
        case 'GET_SAMPLE_DATA':
          console.log('Processing GET_SAMPLE_DATA for:', request.dbName, request.storeName);
          if (!request.dbName || !request.storeName) {
            sendResponse({ success: false, error: 'Database name and store name are required' });
            return;
          }
          const sampleData = await dbAccess.getSampleData(
            request.dbName, 
            request.storeName, 
            request.sampleSize || 3
          );
          sendResponse({ success: true, data: sampleData });
          break;

        // CRUD Operations
        case 'CREATE_RECORD':
          console.log('Processing CREATE_RECORD for:', request.dbName, request.storeName);
          if (!request.dbName || !request.storeName || !request.record) {
            sendResponse({ success: false, error: 'Database name, store name, and record are required' });
            return;
          }
          const createdKey = await dbAccess.createRecord(
            request.dbName,
            request.storeName,
            request.record
          );
          sendResponse({ success: true, data: { key: createdKey } });
          break;

        case 'UPDATE_RECORD':
          console.log('Processing UPDATE_RECORD for:', request.dbName, request.storeName);
          if (!request.dbName || !request.storeName || !request.record) {
            sendResponse({ success: false, error: 'Database name, store name, and record are required' });
            return;
          }
          await dbAccess.updateRecord(
            request.dbName,
            request.storeName,
            request.record
          );
          sendResponse({ success: true, data: { message: 'Record updated successfully' } });
          break;

        case 'DELETE_RECORD':
          console.log('Processing DELETE_RECORD for:', request.dbName, request.storeName);
          if (!request.dbName || !request.storeName || !request.record) {
            sendResponse({ success: false, error: 'Database name, store name, and record are required' });
            return;
          }
          await dbAccess.deleteRecord(
            request.dbName,
            request.storeName,
            request.record
          );
          sendResponse({ success: true, data: { message: 'Record deleted successfully' } });
          break;

        case 'GET_RECORD':
          console.log('Processing GET_RECORD for:', request.dbName, request.storeName);
          if (!request.dbName || !request.storeName || request.key === undefined) {
            sendResponse({ success: false, error: 'Database name, store name, and key are required' });
            return;
          }
          const record = await dbAccess.getRecord(
            request.dbName,
            request.storeName,
            request.key
          );
          sendResponse({ success: true, data: record });
          break;
          
        default:
          console.error('Unknown action:', request.action);
          sendResponse({ success: false, error: 'Unknown action: ' + request.action });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  })();
  
  return true; // Keep message channel open for async response
});