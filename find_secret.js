const fs = require('fs');
const text = fs.readFileSync('push_error.txt', 'utf16le');
const lines = text.split('\n');
lines.forEach(line => {
    if (line.includes('remote:')) console.log(line);
});
