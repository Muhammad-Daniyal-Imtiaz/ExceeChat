// utils/parseExcel.ts
import * as XLSX from 'xlsx';

export async function parseExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    throw new Error('No file data found');
                }

                const workbook = XLSX.read(data, { type: 'array' });

                // Take first sheet
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                resolve(jsonData);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);

        reader.readAsArrayBuffer(file);
    });
}