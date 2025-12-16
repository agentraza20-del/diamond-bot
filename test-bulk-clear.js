const fetch = require('node-fetch');

async function testBulkClear() {
    try {
        const groupIds = ['120363405821339800@g.us']; // Bot making group
        
        console.log('Testing bulk clear with group:', groupIds);
        
        const response = await fetch('http://127.0.0.1:3005/api/groups/bulk-clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupIds })
        });

        const result = await response.json();
        console.log('Result:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testBulkClear();
