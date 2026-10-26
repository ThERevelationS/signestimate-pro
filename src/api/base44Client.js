import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion } = appParams;

// The SDK always talks to the platform origin that served the app. serverUrl
// must never be built from a URL parameter or localStorage: that would send
// authenticated API traffic — including the session token — to a host named by
// whoever wrote the link.
const serverUrl = "";

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});