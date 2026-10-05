import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      errors: ["Missing or invalid token"],
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not configured");

    const payload = jwt.verify(token, secret) as any;
    (req as any).user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      errors: ["Invalid token"],
    });
  }
};
