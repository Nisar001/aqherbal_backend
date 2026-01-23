// Resolves client IP and attaches to req.userIp for consistent usage
export const resolveIpMiddleware = (req, res, next) => {
  const xff = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xff) ? xff[0] : (xff?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.connection?.remoteAddress);
  req.userIp = ip;
  next();
};
