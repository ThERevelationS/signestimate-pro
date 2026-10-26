import { base44 } from './base44Client';

// Client-safe integrations only. File uploads stay in the browser; every
// restricted integration (LLM, email, image generation) runs inside a backend
// function instead — see base44/functions/ai*.
export const Core = base44.integrations.Core;

export const UploadFile = base44.integrations.Core.UploadFile;