type ClientErrorEvent = {
  message: string;
  source: string;
  stack?: string;
  createdAt: string;
};

const ERROR_LOG_KEY = "mgl_client_errors";
const MAX_STORED_ERRORS = 30;

function readStoredErrors(): ClientErrorEvent[] {
  try {
    const raw = window.localStorage.getItem(ERROR_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClientErrorEvent[];
  } catch {
    return [];
  }
}

function writeStoredErrors(events: ClientErrorEvent[]) {
  try {
    window.localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(events));
  } catch {
    // noop: não deve quebrar a UI por falha de monitoramento
  }
}

export function captureClientError({
  message,
  source,
  stack,
}: {
  message: string;
  source: string;
  stack?: string;
}) {
  const event: ClientErrorEvent = {
    message: message.slice(0, 600),
    source,
    stack: stack?.slice(0, 4000),
    createdAt: new Date().toISOString(),
  };

  const next = [event, ...readStoredErrors()].slice(0, MAX_STORED_ERRORS);
  writeStoredErrors(next);
  console.error(`[monitor] ${source}: ${message}`);
}

export function loadClientErrors() {
  return readStoredErrors();
}
