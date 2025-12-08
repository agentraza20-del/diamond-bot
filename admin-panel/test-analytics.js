const http = require('http');

http.get('http://localhost:3000/api/analytics', (res) => {
    let data = '';
    res.on('data', chunk => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\n========================================');
        console.log('ANALYTICS API RESPONSE:');
        console.log('========================================\n');
        
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Response (raw):', data);
        }
        
        console.log('\n========================================\n');
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
