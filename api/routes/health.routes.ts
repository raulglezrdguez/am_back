import { Router } from "express";

import { getHealth } from "../controllers/heath.controller.ts";

const router = Router();

/*
 * GET /api/health → simple health-check
 */
router.get("/health", getHealth);

export default router;
