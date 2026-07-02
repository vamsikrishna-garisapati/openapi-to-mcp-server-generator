export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export function createLogger(prefix = ""): Logger {
  const format = (message: string) => (prefix ? `[${prefix}] ${message}` : message);

  return {
    info: (message: string) => console.log(format(message)),
    warn: (message: string) => console.warn(format(message)),
    error: (message: string) => console.error(format(message)),
    debug: (message: string) => {
      if (process.env.DEBUG) {
        console.debug(format(message));
      }
    },
  };
}
