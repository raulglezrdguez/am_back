import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

import { JWT_SECRET } from "../config/index.ts";
import User from "../models/user.model.ts";
import adminFirebase from "../config/admin.firebase.ts";
import type { DecodedIdToken } from "firebase-admin/auth";

const audit = (event: string, data: Record<string, unknown>) => {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...data,
    }),
  );
};

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
  token: string,
): Promise<DecodedIdToken | null> => {
  try {
    // checkRevoked = true: rechaza tokens de usuarios deshabilitados o sesiones revocadas
    return await adminFirebase.auth().verifyIdToken(token, true);
  } catch (idTokenError: any) {
    // Si el token fue revocado explícitamente, no intentes session cookie
    if (idTokenError?.code === "auth/id-token-revoked") {
      audit("auth.firebase.token_revoked", { tokenType: "id_token" });
      return null;
    }
    try {
      // checkRevoked = true para session cookies también
      return await adminFirebase.auth().verifySessionCookie(token, true);
    } catch (sessionError: any) {
      if (sessionError?.code === "auth/session-cookie-revoked") {
        audit("auth.firebase.session_cookie_revoked", {
          tokenType: "id_token",
        });
      } else {
        audit("auth.firebase.session.invalid_token", {
          error: sessionError?.code,
        });
      }
      return null;
    }
  }
};

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
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

  try {
    await verifyLocalUser(token, req);

    if (req.user) {
      return next();
    }

    // Verificar token de Firebase si es un token de Firebase
    const firebaseUser = await verifyFirebaseToken(token);

    if (firebaseUser) {
      // bloquear cualquier operación con email no verificado
      if (!firebaseUser.email_verified) {
        audit("auth.firebase.unverified_email", { email: firebaseUser.email });
        req.user = null;
        return next();
      }

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
          status: 0, // ⚠️ inactivo hasta aprobación manual
        });

        req.user = null;
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
