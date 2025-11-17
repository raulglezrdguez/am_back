import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

import { JWT_SECRET } from "../config/index.ts";
import User from "../models/user.model.ts";
import adminFirebase from "../config/admin.firebase.ts";
import type { DecodedIdToken } from "firebase-admin/auth";

// Verifica el token contra la base de datos local
const verifyLocalUser = async (token: string, req: any) => {
  try {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const dbUser = await User.findOne({
      _id: decoded.id,
      email: decoded.email,
      status: 1,
    }).lean();
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
  } catch (error: any) {
    req.user = null;
  }
};

const verifyFirebaseToken = async (
  token: string
): Promise<DecodedIdToken | null> => {
  try {
    // Intenta ID token primero (más común)
    return await adminFirebase.auth().verifyIdToken(token);
  } catch (idTokenError) {
    try {
      return await adminFirebase.auth().verifySessionCookie(token);
    } catch (sessionError) {
      console.error("Token inválido:", sessionError);
      return null; // Ambos métodos fallaron
    }
  }
};

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if ((global as any).__TEST_TEAR_DOWN__) {
    return res.status(503).end(); // servidor cerrado
  }

  const header = req.headers.authorization || req.headers.Authorization;

  if (
    !header ||
    Array.isArray(header) ||
    (!header.startsWith("Bearer ") && !header.startsWith("bearer "))
  ) {
    req.user = null; // sin token → anónimo
    return next();
  }

  const token = header.split(" ")[1];

  console.log(token);

  try {
    await verifyLocalUser(token, req);

    if (req.user) {
      return next();
    }

    // Verificar token de Firebase si es un token de Firebase
    const firebaseUser = await verifyFirebaseToken(token);

    if (firebaseUser) {
      const dbUser = await User.findOne({ email: firebaseUser.email }).lean();
      if (dbUser) {
        if (dbUser.status === 1) {
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
      } else if (firebaseUser.name && firebaseUser.email) {
        const newDbUser = await User.create({
          name: firebaseUser.name,
          email: firebaseUser.email,
          role: 1,
          status: 1,
        });

        req.user = {
          id: newDbUser._id.toString(),
          name: newDbUser.name,
          email: newDbUser.email,
          role: 1,
          status: 1,
        };
      } else {
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null; // token inválido → anónimo
    next();
  }
}
