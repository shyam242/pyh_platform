import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json("No token");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      // Invalid signature or malformed token
      return res.status(401).json({ 
        message: "Invalid or expired token. Please sign in again.",
        error: "TOKEN_INVALID"
      });
    }
    return res.status(401).json({ message: "Authentication failed" });
  }
};
