// Env-driven blacklist: comma-separated IPs in BLACKLISTED_IPS
const envList = process.env.BLACKLISTED_IPS || '';
const blacklistedIps = envList.split(',').map(s => s.trim()).filter(Boolean);

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
