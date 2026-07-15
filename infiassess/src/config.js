// Base URL of the code-runner service (the "Run" button in Short Coding).
// Override at runtime by setting window.__IA_RUNNER_URL__ before the app loads,
// or point it at the Ryugod Docker runner endpoint in production.
export const RUNNER_URL =
  (typeof window !== 'undefined' && window.__IA_RUNNER_URL__) ||
  'https://aptivate-infiligence-1052868665315.asia-south2.run.app'

// Token the admin app uses to push hidden test cases to the runner (POST /tests).
// NOTE: this ships in the client bundle, so treat it as a soft guard for the
// local/backup setup — move grading to a server (Cloud Function) for production.
export const RUNNER_ADMIN_TOKEN =
  (typeof window !== 'undefined' && window.__IA_RUNNER_TOKEN__) || 'infiassess-runner-admin'
