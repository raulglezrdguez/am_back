import { Router } from "express";
import {
  getHealth,
  getLiveness,
  getReadiness,
} from "../controllers/health.controller.ts";

const router = Router();

router.get("/health", getHealth); // legacy, ahora readiness
router.get("/health/live", getLiveness);
router.get("/health/ready", getReadiness);

export default router;
