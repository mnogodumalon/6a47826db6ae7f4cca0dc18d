import * as Sentry from '@sentry/react';

const DSN = "";
const ENVIRONMENT = "dashboard-6a47826db6ae7f4cca0dc18d";
const RELEASE = "0.0.203";
const APPGROUP_ID = "6a47826db6ae7f4cca0dc18d";

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT || undefined,
    release: RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
  if (APPGROUP_ID) {
    Sentry.setTag('appgroup_id', APPGROUP_ID);
  }
}

export { Sentry };
