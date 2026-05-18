const http = require('http');

const data = JSON.stringify({
    firstName: 'Vendor',
    lastName: 'Test',
    email: 'vendor2@example.com',
    password: 'test',
    role: 'VENDOR'
});

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log('Register status:', res.statusCode);
        const parsed = JSON.parse(body);
        if(!parsed.token) return console.log(parsed);

        http.get({
            hostname: 'localhost',
            port: 5000,
            path: '/api/dashboard/stats',
            headers: { 'Authorization': `Bearer ${parsed.token}` }
        }, res2 => {
            let body2 = '';
            res2.on('data', d => body2 += d);
            res2.on('end', () => console.log('Stats status:', res2.statusCode, '\n', body2));
        });
    });
});
req.write(data);
req.end();
