import Dexie from 'dexie';

interface DatabaseInfo {
  name: string;
  version: number;
  tables: string[];
  tableCount: number;
}

interface TableDataResult {
  data: any[];
  totalCount: number;
  filteredCount: number;
  pageInfo: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface TableOptions {
  search?: string;
  orderBy?: string;
  direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface TableSchema {
  name: string;
  primaryKey: any;
  indexes: Array<{
    name: string;
    keyPath: string | string[];
    unique: boolean;
    multiEntry?: boolean;
  }>;
  autoIncrement: boolean;
}

class DexieIndexedDBService {
  private openDatabases: Map<string, Dexie> = new Map();

  async getDatabases(): Promise<DatabaseInfo[]> {
    try {
      // Get all available databases using native IndexedDB
      const databases = await (indexedDB as any).databases() as Array<{name: string, version: number}>;
      const result: DatabaseInfo[] = [];

      for (const dbInfo of databases) {
        try {
          const tables = await this.getTableNames(dbInfo.name);
          result.push({
            name: dbInfo.name,
            version: dbInfo.version || 1,
            tables,
            tableCount: tables.length
          });
        } catch (error) {
          console.error(`Error accessing database ${dbInfo.name}:`, error);
          result.push({
            name: dbInfo.name,
            version: dbInfo.version || 1,
            tables: [],
            tableCount: 0
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting databases:', error);
      return [];
    }
  }

  async getTableNames(dbName: string): Promise<string[]> {
    try {
      // Open database to get table names
      const db = await this.openDatabase(dbName);
      const tableNames = db.tables.map(table => table.name);
      return tableNames;
    } catch (error) {
      console.error(`Error getting table names for ${dbName}:`, error);
      return [];
    }
  }

  async getTableData(
    dbName: string, 
    tableName: string, 
    options: TableOptions = {}
  ): Promise<TableDataResult> {
    const {
      search = '',
      orderBy,
      direction = 'asc',
      limit = 20,
      offset = 0
    } = options;

    try {
      const db = await this.openDatabase(dbName);
      const table = db.table(tableName);

      // Get total count
      const totalCount = await table.count();

      // Build query
      let collection = table.toCollection();

      // Apply search filter
      if (search && search.trim()) {
        collection = collection.filter(item => 
          this.searchInObject(item, search.toLowerCase())
        );
      }

      // Apply sorting
      if (orderBy) {
        try {
          // Try to use indexed sorting first
          const sortedCollection = direction === 'desc' 
            ? table.orderBy(orderBy).reverse()
            : table.orderBy(orderBy);
          
          if (search && search.trim()) {
            collection = sortedCollection.filter(item => 
              this.searchInObject(item, search.toLowerCase())
            );
          } else {
            collection = sortedCollection;
          }
        } catch (indexError) {
          // Fallback to manual sorting if index doesn't exist
          console.warn(`No index for ${orderBy}, using manual sorting`);
          const allData = await collection.toArray();
          const sortedData = allData.sort((a, b) => {
            const aValue = this.getNestedValue(a, orderBy);
            const bValue = this.getNestedValue(b, orderBy);
            
            let comparison = 0;
            if (aValue > bValue) comparison = 1;
            if (aValue < bValue) comparison = -1;
            
            return direction === 'desc' ? -comparison : comparison;
          });

          const paginatedData = sortedData.slice(offset, offset + limit);
          
          return {
            data: paginatedData,
            totalCount,
            filteredCount: sortedData.length,
            pageInfo: this.buildPageInfo(offset, limit, sortedData.length)
          };
        }
      }

      // Get filtered count
      const filteredCount = await collection.count();

      // Apply pagination
      const data = await collection.offset(offset).limit(limit).toArray();

      return {
        data,
        totalCount,
        filteredCount,
        pageInfo: this.buildPageInfo(offset, limit, filteredCount)
      };

    } catch (error) {
      console.error(`Error getting table data for ${dbName}.${tableName}:`, error);
      throw error;
    }
  }

  async getTableSchema(dbName: string, tableName: string): Promise<TableSchema | null> {
    try {
      const db = await this.openDatabase(dbName);
      const table = db.table(tableName);
      
      // Safely extract schema information
      const schema: TableSchema = {
        name: tableName,
        primaryKey: table.schema.primKey || null,
        indexes: [],
        autoIncrement: table.schema.primKey?.auto || false
      };

      // Extract index information safely
      if (table.schema.indexes) {
        schema.indexes = table.schema.indexes.map(index => ({
          name: index.name || '',
          keyPath: index.keyPath || '',
          unique: index.unique || false,
          multiEntry: (index as any).multiEntry || false // Safe casting
        }));
      }

      return schema;
    } catch (error) {
      console.error(`Error getting schema for ${dbName}.${tableName}:`, error);
      return null;
    }
  }

  // Workorder-specific filtering using Dexie
  async getFilteredWorkorders(
    dbName: string,
    since: number,
    until: number,
    options: {
      alsoUnassigned?: boolean;
      alsoUncompleted?: boolean;
      alsoStarted?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<TableDataResult> {
    try {
      const db = await this.openDatabase(dbName);
      
      // Check if workorders table exists
      const tableExists = db.tables.some(table => table.name === 'workorders');
      if (!tableExists) {
        throw new Error('Workorders table not found');
      }

      const workordersTable = db.table('workorders');

      // Start with all records and filter manually for complex logic
      let collection = workordersTable.toCollection();

      // Apply complex workorder filtering
      collection = collection.filter(wo => {
        return this.workorderTimeFilter(wo, since, until, options);
      });

      // Get counts
      const totalCount = await workordersTable.count();
      const filteredCount = await collection.count();

      // Apply pagination
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      const data = await collection.offset(offset).limit(limit).toArray();

      return {
        data,
        totalCount,
        filteredCount,
        pageInfo: this.buildPageInfo(offset, limit, filteredCount)
      };

    } catch (error) {
      console.error('Error getting filtered workorders:', error);
      throw error;
    }
  }

  private workorderTimeFilter(
    wo: any, 
    since: number, 
    until: number, 
    options: any = {}
  ): boolean {
    // Your original filtering logic
    const executionTime = wo.executionTime || 0;
    const completionTime = wo.completionTime || 0;
    const startTime = wo.startTime;
    const endTime = wo.endTime;
    const status = wo.status;

    // Basic time intersection
    const minTime = Math.min(
      executionTime, 
      completionTime,
      startTime || Infinity,
      endTime || Infinity
    );
    const maxTime = Math.max(
      executionTime,
      completionTime, 
      startTime || 0,
      endTime || 0
    );

    let matches = maxTime >= since && minTime <= until;

    // Additional conditions
    if (options.alsoUncompleted && status !== 'COMPLETED') {
      matches = true;
    }

    if (options.alsoUnassigned && status === 'NEW') {
      matches = true;
    }

    if (options.alsoStarted && (status === 'WORKING' || status === 'WAITING')) {
      matches = true;
    }

    return matches;
  }

  private async openDatabase(dbName: string): Promise<Dexie> {
    if (this.openDatabases.has(dbName)) {
      return this.openDatabases.get(dbName)!;
    }

    try {
      // Open database without specifying schema (let Dexie auto-detect)
      const db = new Dexie(dbName);
      await db.open();
      
      this.openDatabases.set(dbName, db);
      return db;
    } catch (error) {
      console.error(`Error opening database ${dbName}:`, error);
      throw error;
    }
  }

  private buildPageInfo(offset: number, limit: number, totalCount: number) {
    const currentPage = Math.floor(offset / limit);
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      currentPage,
      totalPages,
      pageSize: limit,
      hasNext: currentPage < totalPages - 1,
      hasPrev: currentPage > 0
    };
  }

  private searchInObject(obj: any, searchTerm: string): boolean {
    const searchInValue = (value: any): boolean => {
      if (value === null || value === undefined) return false;
      
      if (typeof value === 'object') {
        return Object.values(value).some(searchInValue);
      }
      
      return String(value).toLowerCase().includes(searchTerm);
    };
    
    return searchInValue(obj);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  }

  // Cleanup method
  closeAll() {
    this.openDatabases.forEach(db => {
      try {
        db.close();
      } catch (error) {
        console.warn('Error closing database:', error);
      }
    });
    this.openDatabases.clear();
  }
}

// Export singleton instance
export const dexieService = new DexieIndexedDBService();