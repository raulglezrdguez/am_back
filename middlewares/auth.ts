import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

import { JWT_SECRET, NODE_ENV } from "../config/index.ts";
import User from "../models/user.model.ts";
import adminFirebase from "../config/admin.firebase.ts";
import type { DecodedIdToken } from "firebase-admin/auth";

import { logger, sanitizeError } from "./logger.ts";
import {
  writeAuditEvent,
  type AuditContext,
} from "../services/audit.service.ts";

const auditContext = (req: Request): AuditContext => ({
  requestId: req.id,
  userId: req.user?.id ?? null,
  userRole: req.user?.role ?? null,
  ip: req.ip ?? null,
  userAgent: req.headers["user-agent"]?.slice(0, 256) ?? null,
});

const auditAuth = (
  req: Request,
  event: Parameters<typeof writeAuditEvent>[0],
) => {
  // Auth no debe bloquearse si la auditoría falla; se alerta por métrica/log.
  void writeAuditEvent(event, auditContext(req), { failClosed: false }).catch(
    () => undefined,
  );
};

// Verifica el token contra la base de datos local
const verifyLocalUser = async (token: string, req: any) => {
  try {
    if (!JWT_SECRET) {
      throw new Error(
        "JWT_SECRET missing — this should have failed at startup",
      );
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
    logger.debug({ err: sanitizeError(error) }, "jwt_verification_failed");
    req.user = null;
  }
};

type FirebaseFailureReason =
  | "TOKEN_REVOKED"
  | "SESSION_COOKIE_REVOKED"
  | "INVALID_TOKEN";

type FirebaseTokenResult =
  | {
      user: DecodedIdToken;
      reason?: undefined;
      tokenType: "id_token" | "session_cookie";
    }
  | {
      user: null;
      reason: FirebaseFailureReason;
      tokenType: "id_token" | "session_cookie";
    };

const verifyFirebaseToken = async (
  token: string,
): Promise<FirebaseTokenResult> => {
  try {
    // checkRevoked = true: rechaza tokens de usuarios deshabilitados o sesiones revocadas
    const user = await adminFirebase.auth().verifyIdToken(token, true);
    return { user, tokenType: "id_token" };
  } catch (idTokenError: any) {
    // Si el token fue revocado explícitamente, no intentes session cookie
    if (idTokenError?.code === "auth/id-token-revoked") {
      return { user: null, reason: "TOKEN_REVOKED", tokenType: "id_token" };
    }

    try {
      // checkRevoked = true para session cookies también
      const user = await adminFirebase.auth().verifySessionCookie(token, true);
      return { user, tokenType: "session_cookie" };
    } catch (sessionError: any) {
      return {
        user: null,
        reason:
          sessionError?.code === "auth/session-cookie-revoked"
            ? "SESSION_COOKIE_REVOKED"
            : "INVALID_TOKEN",
        tokenType: "session_cookie",
      };
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

    if (NODE_ENV === "test") {
      // En tests no se llama a Firebase: evita red y credenciales reales.
      req.user = null;
      return next();
    }

    // Verificar token de Firebase si es un token de Firebase
    const firebaseResult = await verifyFirebaseToken(token);

    if (!firebaseResult.user) {
      // Un único evento, con el motivo específico del fallo.
      auditAuth(req, {
        operation: "auth.token",
        operationType: "system",
        resourceType: "Auth",
        result: "denied",
        reason: firebaseResult.reason,
        metadata: {
          method: "firebase",
          tokenType: firebaseResult.tokenType,
        },
      });
      req.user = null;
      return next();
    }

    const firebaseUser = firebaseResult.user;

    // bloquear cualquier operación con email no verificado
    if (!firebaseUser.email_verified) {
      // Email no verificado: NO loguear el email
      auditAuth(req, {
        operation: "auth.email",
        operationType: "system",
        resourceType: "Auth",
        result: "denied",
        reason: "EMAIL_UNVERIFIED",
        metadata: { method: "firebase", emailVerified: false },
      });
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
        // Usuario inactivo
        auditAuth(req, {
          operation: "auth.user",
          operationType: "system",
          resourceType: "User",
          resourceId: dbUser._id.toString(),
          result: "denied",
          reason: "USER_INACTIVE",
          metadata: { method: "firebase" },
        });
        req.user = null;
      }
    } else if (firebaseUser.name && firebaseUser.email) {
      const newDbUser = await User.create({
        name: firebaseUser.name,
        email: firebaseUser.email,
        role: 1,
        status: 0, // ⚠️ inactivo hasta aprobación manual
      });

      // Usuario provisionado automáticamente
      auditAuth(req, {
        operation: "auth.user.provision",
        operationType: "system",
        resourceType: "User",
        resourceId: newDbUser._id.toString(),
        result: "success",
        metadata: { method: "firebase", provisioned: true },
      });

      req.user = null;
    } else {
      // Token de Firebase válido pero sin perfil utilizable (sin name/email)
      auditAuth(req, {
        operation: "auth.firebase.profile",
        operationType: "system",
        resourceType: "Auth",
        result: "denied",
        reason: "PROFILE_INCOMPLETE",
        metadata: { method: "firebase" },
      });
      req.user = null;
    }

    next();
  } catch (err) {
    // Red de seguridad: solo debería llegarse aquí por un fallo inesperado
    // (Mongo caído, etc.), no por un token inválido.
    logger.debug({ err: sanitizeError(err) }, "auth_unexpected_failure");
    auditAuth(req, {
      operation: "auth.unexpected",
      operationType: "system",
      resourceType: "Auth",
      result: "error",
      reason: "AUTH_PIPELINE_ERROR",
      metadata: { method: "unknown" },
    });
    req.user = null; // fallo inesperado → anónimo (fail-closed aguas abajo)
    next();
  }
}
