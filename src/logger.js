const priorities = { debug: 10, info: 20, warn: 30, error: 40 };

function errorDetails(error) {
  if (!(error instanceof Error)) return error;
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.cause ? { cause: errorDetails(error.cause) } : {}),
  };
}

export function createLogger(level = "info") {
  const threshold = priorities[level] ?? priorities.info;

  function write(severity, message, details = {}) {
    if (priorities[severity] < threshold) return;
    const record = {
      time: new Date().toISOString(),
      level: severity,
      message,
      ...details,
    };
    if (record.error) record.error = errorDetails(record.error);
    const output = JSON.stringify(record);
    (severity === "error" ? console.error : console.log)(output);
  }

  return {
    debug: (message, details) => write("debug", message, details),
    info: (message, details) => write("info", message, details),
    warn: (message, details) => write("warn", message, details),
    error: (message, details) => write("error", message, details),
  };
}
