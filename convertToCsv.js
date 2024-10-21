const { readFileSync, writeFileSync } = require('fs-extra');

function exportToCSVForAll(data) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    let csvContent = headers.join(',') + '\n';

    data.forEach((item) => {
        const row = Object.values(item).map((text) => {
            if (typeof text !== 'string') return text;
            return text.replace(/"/g, '""').replace(/,/g, ''); // Escape quotes in title
        });
        csvContent += row.join(',') + '\n';
    });

    writeFileSync('suspended_order.csv', csvContent, {
        encoding: 'utf-8',
    });
}

module.exports = exportToCSVForAll;
