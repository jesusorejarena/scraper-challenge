import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('page.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Rows in fPP:processosTable: ' + $('[id="fPP:processosTable"] tbody tr').length);

$('[id="fPP:processosTable"] tbody tr').each((rowIndex, rowEl) => {
    if (rowIndex < 3) {
        console.log(`--- Row ${rowIndex} ---`);
        $(rowEl).find('td').each((colIndex, colEl) => {
            console.log(`Col ${colIndex}: ${$(colEl).text().replace(/\s+/g, ' ').trim()}`);
            // Check for links
            const href = $(colEl).find('a').attr('href');
            if (href) {
                console.log(`  Link: ${href}`);
            }
        });
    }
});

console.log("Pagination info:");
$('.rich-datascr').each((i, el) => {
    console.log($(el).html());
});

