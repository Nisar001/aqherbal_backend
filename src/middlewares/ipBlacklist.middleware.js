const blacklistedIps = [
  // Add suspicious IPs here
  // '123.123.123.123',
];

export const ipBlacklistMiddleware = (req, res, next) => {
  const ip = req.userIp || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (blacklistedIps.includes(ip)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied from this IP address.'
    });
  }
  next();
};
