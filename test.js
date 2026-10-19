const http = require('http'), fs = require('fs');
const { handler } = require('./server.js');
let seen = null;
const upstream = http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    seen = { headers: req.headers, body: JSON.parse(b) };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ content: [{ type: 'text', text: 'Here you go:\n```json\n{"supplier":"Test Fuel","invoiceNumber":"INV-7","invoiceDate":"2026-10-14","litres":40,"ratePerLitre":30,"total":1200,"fuelType":"Diesel","confidence":"high","notes":""}\n```' }] }));
  });
}).listen(8790);
process.env.ANTHROPIC_BASE_URL = 'http://localhost:8790'; process.env.ANTHROPIC_API_KEY = 'test-key'; process.env.READER_TOKEN = 'secret';
const app = http.createServer(handler()).listen(8791, async () => {
  const pdf = fs.readFileSync('/tmp/claude-0/-home-claude/0313963c-f3c8-5cc7-bcdd-fe5e21020e5e/scratchpad/work/out/blank_local_pdf.pdf').toString('base64');
  const post = async (headers, body) => { const r = await fetch('http://localhost:8791/api/read-invoice', { method:'POST', headers: Object.assign({'content-type':'application/json'}, headers), body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; };
  const ok = await post({ 'x-reader-token':'secret' }, { files:[{ type:'application/pdf', data: pdf }] });
  console.log('1 ok:', ok.status, JSON.stringify(ok.json.data));
  console.log('  upstream key header ok:', seen.headers['x-api-key'] === 'test-key', '| doc block:', seen.body.messages[0].content[0].type, '| model:', seen.body.model);
  console.log('  key not leaked to client:', !JSON.stringify(ok.json).includes('test-key'));
  console.log('2 no token:', (await post({}, { files:[{type:'application/pdf', data: pdf}] })).status);
  console.log('3 bad type:', (await post({ 'x-reader-token':'secret' }, { files:[{type:'text/plain', data:'aGk='}] })).status);
  console.log('4 no files:', (await post({ 'x-reader-token':'secret' }, { files:[] })).status);
  app.close(); upstream.close();
});
