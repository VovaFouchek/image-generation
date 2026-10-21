import "server-only";
import { z } from "zod";
import { TenantMembershipError } from "@/lib/supabase/session";
import {
  BriefConflictError,
  DailyLimitError,
  InvalidSourceBatchError,
  NotFoundError,
  UnauthorizedError,
  UnknownReferenceError,
} from "../domain/errors";

/** Maps feature errors to JSON responses so route handlers stay one-liners. */
export function toErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: "invalid_request", issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof UnknownReferenceError) {
    return Response.json(
      { error: error.code, message: error.message, field: error.field },
      { status: 400 },
    );
  }
  if (error instanceof BriefConflictError) {
    return Response.json(
      { error: error.code, message: error.message, ruleIds: error.ruleIds },
      { status: 422 },
    );
  }
  if (error instanceof InvalidSourceBatchError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: 409 },
    );
  }
  if (error instanceof UnauthorizedError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: 401 },
    );
  }
  if (error instanceof TenantMembershipError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: 403 },
    );
  }
  if (error instanceof DailyLimitError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: 429 },
    );
  }
  if (error instanceof NotFoundError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: 404 },
    );
  }
  console.error(error);
  return Response.json({ error: "internal_error" }, { status: 500 });
}
