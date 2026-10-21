// Client-safe entry point of the feature: options, request schemas and the view types the
// browser receives. Server code lives behind "@/features/image-generation/server".
export * from "./domain/options";
export {
  createBatchBodySchema,
  generationRequestSchema,
  type CreateBatchBody,
  type GenerationRequest,
} from "./domain/request";
export type { BatchView, ItemView } from "./domain/views";
export type { ProviderErrorKind } from "./domain/errors";
