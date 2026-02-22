const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Ghost Relay Online');
});

const wss = new WebSocket.Server({ server });
const clients = new Map();
const pending = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'REGISTER') {
        clients.set(msg.ghostId, ws);
        console.log('Registered: ' + msg.ghostId);
        const queue = pending.get(msg.ghostId) || [];
        queue.forEach(m => ws.send(JSON.stringify(m)));
        pending.delete(msg.ghostId);
      }
      if (msg.type === 'SEND') {
        const recipient = clients.get(msg.to);
        if (recipient && recipient.readyState === 1) {
          recipient.send(JSON.stringify({
            type: 'MSG',
            from: msg.from,
            ciphertext: msg.ciphertext
          }));
          console.log('Delivered: ' + msg.from + ' to ' + msg.to);
        } else {
          if (!pending.has(msg.to)) pending.set(msg.to, []);
          pending.get(msg.to).push({
            type: 'MSG', from: msg.from,
            ciphertext: msg.ciphertext
          });
          console.log('Queued for: ' + msg.to);
        }
      }
    } catch(e) { console.log('Error: ' + e.message); }
  });
  ws.on('close', () => {
    clients.forEach((v,k) => { if(v===ws) clients.delete(k); });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Ghost Relay running on port ' + PORT);
});
