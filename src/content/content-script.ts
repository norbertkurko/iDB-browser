// src/content/content-script.ts - TELJES JAVÍTOTT VERZIÓ
console.log('IndexedDB Explorer content script loaded');

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

// class EnhancedIndexedDBAccess {
  
//   async getDatabases(): Promise<DatabaseInfo[]> {
//     try {
//       console.log('Getting databases...');
//       // Type assertion for indexedDB.databases()
//       const databases = await (indexedDB as any).databases() as Array<{name: string, version: number}>;
//       console.log('Raw databases:', databases);
      
//       const result: DatabaseInfo[] = [];
      
//       for (const dbInfo of databases) {
//         try {
//           console.log(`Processing database: ${dbInfo.name}`);
//           const db = await this.openDatabase(dbInfo.name);
//           const stores = Array.from(db.objectStoreNames);
//           console.log(`Database ${dbInfo.name} has stores:`, stores);
          
//           result.push({
//             name: dbInfo.name,
//             version: dbInfo.version || 1,
//             stores,
//             storeCount: stores.length
//           });
          
//           db.close();
//         } catch (error) {
//           console.error(`Error accessing database ${dbInfo.name}:`, error);
//           // Include even errored databases in the list
//           result.push({
//             name: dbInfo.name,
//             version: dbInfo.version || 1,
//             stores: [],
//             storeCount: 0
//           });
//         }
//       }
      
//       console.log('Final databases result:', result);
//       return result;
//     } catch (error) {
//       console.error('Error getting databases:', error);
//       return [];
//     }
//   }

//   async getDatabaseStores(dbName: string): Promise<StoreInfo[]> {
//     try {
//       console.log(`Getting stores for database: ${dbName}`);
//       const db = await this.openDatabase(dbName);
//       const stores: StoreInfo[] = [];
      
//       for (let i = 0; i < db.objectStoreNames.length; i++) {
//         const storeName = db.objectStoreNames[i];
//         console.log(`Processing store: ${storeName}`);
        
//         try {
//           const transaction = db.transaction([storeName], 'readonly');
//           const store = transaction.objectStore(storeName);
          
//           // Get store schema
//           const indexes: IndexInfo[] = [];
//           for (let j = 0; j < store.indexNames.length; j++) {
//             const indexName = store.indexNames[j];
//             const index = store.index(indexName);
//             indexes.push({
//               name: indexName,
//               keyPath: index.keyPath,
//               unique: index.unique,
//               multiEntry: index.multiEntry
//             });
//           }
          
//           // Get record count
//           const countRequest = store.count();
//           const recordCount = await new Promise<number>((resolve, reject) => {
//             countRequest.onsuccess = () => {
//               console.log(`Store ${storeName} has ${countRequest.result} records`);
//               resolve(countRequest.result);
//             };
//             countRequest.onerror = () => resolve(0); // Fallback to 0 on error
//           });
          
//           stores.push({
//             name: storeName,
//             keyPath: store.keyPath,
//             autoIncrement: store.autoIncrement,
//             indexes,
//             recordCount
//           });
          
//         } catch (error) {
//           console.error(`Error getting store info for ${storeName}:`, error);
//           stores.push({
//             name: storeName,
//             keyPath: null,
//             autoIncrement: false,
//             indexes: [],
//             recordCount: 0
//           });
//         }
//       }
      
//       db.close();
//       console.log(`Stores for ${dbName}:`, stores);
//       return stores;
//     } catch (error) {
//       console.error('Error getting database stores:', error);
//       return [];
//     }
//   }

//   async getTableData(
//     dbName: string, 
//     storeName: string, 
//     options: {
//       limit?: number;
//       offset?: number;
//       search?: string;
//       searchField?: string;
//     } = {}
//   ): Promise<TableDataResponse> {
//     try {
//       console.log(`Getting table data for ${dbName}.${storeName}`, options);
//       const db = await this.openDatabase(dbName);
//       const transaction = db.transaction([storeName], 'readonly');
//       const store = transaction.objectStore(storeName);
      
//       // Get store schema first
//       const indexes: IndexInfo[] = [];
//       for (let i = 0; i < store.indexNames.length; i++) {
//         const indexName = store.indexNames[i];
//         const index = store.index(indexName);
//         indexes.push({
//           name: indexName,
//           keyPath: index.keyPath,
//           unique: index.unique,
//           multiEntry: index.multiEntry
//         });
//       }
      
//       const schema: StoreInfo = {
//         name: storeName,
//         keyPath: store.keyPath,
//         autoIncrement: store.autoIncrement,
//         indexes,
//         recordCount: 0
//       };
      
//       // Get total count
//       const totalCount = await new Promise<number>((resolve, reject) => {
//         const countRequest = store.count();
//         countRequest.onsuccess = () => resolve(countRequest.result);
//         countRequest.onerror = () => reject(countRequest.error);
//       });
      
//       schema.recordCount = totalCount;
      
//       // Get all data (we'll handle filtering in memory for simplicity)
//       let allData = await new Promise<any[]>((resolve, reject) => {
//         const getAllRequest = store.getAll();
//         getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
//         getAllRequest.onerror = () => reject(getAllRequest.error);
//       });
      
//       // Apply search filter if provided
//       if (options.search && options.search.trim()) {
//         const searchTerm = options.search.toLowerCase();
//         const searchField = options.searchField;
        
//         allData = allData.filter(record => {
//           if (searchField) {
//             // Search in specific field
//             const fieldValue = this.getNestedValue(record, searchField);
//             return String(fieldValue).toLowerCase().includes(searchTerm);
//           } else {
//             // Search in all fields
//             return this.searchInAllFields(record, searchTerm);
//           }
//         });
//       }
      
//       // Apply pagination
//       const limit = options.limit || 50;
//       const offset = options.offset || 0;
//       const paginatedData = allData.slice(offset, offset + limit);
      
//       db.close();
      
//       return {
//         data: paginatedData,
//         totalCount: allData.length, // Count after filtering
//         schema
//       };
      
//     } catch (error) {
//       console.error('Error getting table data:', error);
//       throw error;
//     }
//   }

//   private async openDatabase(name: string, version?: number): Promise<IDBDatabase> {
//     return new Promise((resolve, reject) => {
//       const request = indexedDB.open(name, version);
      
//       request.onsuccess = () => resolve(request.result);
//       request.onerror = () => reject(request.error);
//       request.onblocked = () => reject(new Error('Database blocked'));
      
//       // Handle version changes gracefully
//       request.onupgradeneeded = () => {
//         // Don't do anything in upgrade - just let it complete
//       };
//     });
//   }

//   private getNestedValue(obj: any, path: string): any {
//     return path.split('.').reduce((current, key) => {
//       return current && current[key] !== undefined ? current[key] : '';
//     }, obj);
//   }

//   private searchInAllFields(obj: any, searchTerm: string): boolean {
//     const searchInValue = (value: any): boolean => {
//       if (value === null || value === undefined) return false;
      
//       if (typeof value === 'object') {
//         // Recursively search in objects and arrays
//         return Object.values(value).some(searchInValue);
//       }
      
//       return String(value).toLowerCase().includes(searchTerm);
//     };
    
//     return searchInValue(obj);
//   }

//   // Helper method to get sample data for preview
//   async getSampleData(dbName: string, storeName: string, sampleSize: number = 3): Promise<any[]> {
//     try {
//       const response = await this.getTableData(dbName, storeName, { limit: sampleSize });
//       return response.data;
//     } catch (error) {
//       console.error('Error getting sample data:', error);
//       return [];
//     }
//   }
// }

// const dbAccess = new EnhancedIndexedDBAccess();

// Enhanced message handling - COMPLETE VERSION
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