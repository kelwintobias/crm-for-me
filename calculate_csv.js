const fs = require('fs');
const path = require('path');

const csvPath = 'c:\\Users\\kelwi\\Documents\\crm-for-me\\_[COMPRADORES] - UPBOOST 1 - JANEIRO_2026 (1).csv';

try {
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n');
    let total = 0;
    let count = 0;
    let validCount = 0;

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV parsing is tricky with quotes, but let's try a simple approach first
        // The value is the last column
        const lastQuoteIndex = line.lastIndexOf('"');
        if (lastQuoteIndex === -1) {
            // Handle case with no quotes, e.g. the 'x' value
            const parts = line.split(',');
            const val = parts[parts.length - 1];
            console.log(`Line ${i + 1}: Raw value: ${val}`);
            if (val === 'x') continue;
        } else {
            const secondToLastQuoteIndex = line.lastIndexOf('"', lastQuoteIndex - 1);
            if (secondToLastQuoteIndex !== -1) {
                let valStr = line.substring(secondToLastQuoteIndex + 1, lastQuoteIndex);
                // Remove 'R$' and replace ',' with '.'
                valStr = valStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                const val = parseFloat(valStr);

                if (!isNaN(val)) {
                    total += val;
                    validCount++;
                } else {
                    console.log(`Line ${i + 1}: Invalid value parsed: ${valStr}`);
                }
            }
        }
        count++;
    }

    console.log(`Total Rows: ${count}`);
    console.log(`Valid Rows: ${validCount}`);
    console.log(`Total Sum: R$ ${total.toFixed(2)}`);

} catch (e) {
    console.error(e);
}
