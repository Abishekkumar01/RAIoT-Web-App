export function expandCSV(data: any[]): string {
    if (!data || !data.length) return '';

    const separator = ',';
    const keys = Object.keys(data[0]);
    const csvContent =
        keys.join(separator) +
        '\n' +
        data.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = cell instanceof Date ? cell.toISOString() : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(separator);
        }).join('\n');

    return csvContent;
}

export function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function parseCSV(csvText: string): any[] {
    const lines = csvText.split('\n');
    const result = [];
    // Basic CSV parsing
    const hasHeader = lines[0]?.toLowerCase().includes('name') || lines[0]?.toLowerCase().includes('id');
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(p => p.trim()); // Simple split for now

        if (parts.length >= 2) {
            result.push({
                uniqueId: parts[0],
                name: parts[1],
                batch: parts[2] || 'General'
            });
        }
    }
    return result;
}
