export const getHealth = (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
};
