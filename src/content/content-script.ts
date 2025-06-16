import { sharedIDBService } from './shared-idb-service';

console.log('IndexedDB Explorer content script loaded');

// Enhanced message handling with CRUD operations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  (async () => {
    try {
      switch (request.action) {
        case 'GET_DATABASES':
          console.log('Processing GET_DATABASES');
          const databases = await sharedIDBService.getDatabases();
          sendResponse({ success: true, data: databases });
          break;
          
        case 'GET_DATABASE_STORES':
          console.log('Processing GET_DATABASE_STORES for:', request.dbName);
          if (!request.dbName) {
            sendResponse({ success: false, error: 'Database name is required' });
            return;
          }
          const stores = await sharedIDBService.getDatabaseStores(request.dbName);
          sendResponse({ success: true, data: stores });
          break;
          
        case 'GET_TABLE_DATA':
          console.log('Processing GET_TABLE_DATA for:', request.dbName, request.storeName);
          if (!request.dbName || !request.storeName) {
            sendResponse({ success: false, error: 'Database name and store name are required' });
            return;
          }
          const tableData = await sharedIDBService.getTableData(
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
          const sampleData = await sharedIDBService.getSampleData(
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
          const createdKey = await sharedIDBService.createRecord(
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
          await sharedIDBService.updateRecord(
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
          await sharedIDBService.deleteRecord(
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
          const record = await sharedIDBService.getRecord(
            request.dbName,
            request.storeName,
            request.key
          );
          sendResponse({ success: true, data: record });
          break;

        case 'SHOW_DEVTOOLS_NOTIFICATION':
          console.log('Processing SHOW_DEVTOOLS_NOTIFICATION');
          sharedIDBService.showDevToolsNotification();
          sendResponse({ success: true, data: { message: 'Notification shown' } });
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