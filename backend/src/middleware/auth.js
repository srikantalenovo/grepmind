// middleware/auth.js
import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    req.role = req.headers["x-user-role"];
    next();
  });
};

export const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.role)) {
    return res.status(403).json({ error: "Forbidden: insufficient role" });
  }
  next();
};
