import { Router } from 'express';

export const notificationRoutes = Router();

// Store connected clients
const clients: { id: number, res: any }[] = [];

notificationRoutes.get('/stream', (req: any, res: any) => {
  // Check auth
  if (!req.user) {
    return res.status(401).end();
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE

  // Add client
  const clientId = req.user.id;
  clients.push({ id: clientId, res });

  // Send initial connection success message
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Connected to notification stream' })}\\n\\n`);

  // Handle client disconnect
  req.on('close', () => {
    const index = clients.findIndex(c => c.res === res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
});

// Helper to broadcast notification to a specific user
export const sendNotificationToUser = (userId: number, type: string, message: string, data?: any) => {
  const payload = JSON.stringify({ type, message, data, timestamp: new Date().toISOString() });
  
  clients.filter(c => c.id === userId).forEach(client => {
    client.res.write(`data: ${payload}\\n\\n`);
  });
};

// Helper to broadcast notification to all users (or by role)
export const broadcastNotification = (type: string, message: string, data?: any) => {
  const payload = JSON.stringify({ type, message, data, timestamp: new Date().toISOString() });
  
  clients.forEach(client => {
    client.res.write(`data: ${payload}\\n\\n`);
  });
};

