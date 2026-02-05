// utils/db.ts
import Dexie, { Table } from 'dexie';

export interface DatasetRow {
    // The actual row data from Excel – dynamic keys
    [key: string]: any;
}

export interface Dataset {
    id?: string;               // primary key (UUID)
    name: string;              // filename (e.g. "sales.xlsx")
    createdAt: number;         // timestamp
    rowCount: number;
    rows: DatasetRow[];
}

class ExcelChatDB extends Dexie {
    datasets!: Table<Dataset, string>;

    constructor() {
        super('ExcelChatDB');
        this.version(1).stores({
            datasets: 'id, name, createdAt',
            // Note: rows is stored but not indexed (it can be large)
        });
    }
}

export const db = new ExcelChatDB();