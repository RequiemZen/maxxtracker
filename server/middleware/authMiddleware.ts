import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Schema } from 'mongoose';

// Extend the Request type to include the user property
interface AuthenticatedRequest extends Request {
  user?: { id: Schema.Types.ObjectId };
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    
    // Attach user from token payload to request object
    req.user = decoded.user;
    next();

  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

export default authMiddleware; 