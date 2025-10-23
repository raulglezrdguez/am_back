import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

import { JWT_SECRET } from "../config/index.ts";
import User from "../models/user.model.ts";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization || req.headers.Authorization;

  if (!header || Array.isArray(header) || !header.startsWith("Bearer ")) {
    req.user = null; // sin token → anónimo
    return next();
  }

  const token = header.split(" ")[1];

  try {
    // Ensure JWT_SECRET is defined
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
      id: string;
    };
    const dbUser = await User.findById(decoded.id).lean();
    if (dbUser) {
      req.user = {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        status: dbUser.status,
      };
    } else {
      req.user = null;
    }
    next();
  } catch (err) {
    req.user = null; // token inválido → anónimo
    next();
  }
}
