const LOG_PREFIX = '[maanfa-sketcher]'

interface LoggerInstance {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

/**
 * 条件日志记录器。
 *
 * 当 `enabled` 为 `false` 时所有方法变为 no-op，生产环境下关闭即可消除运行时日志。
 * 默认生产环境 `debug` 为 `false`，通过 {@link Sketcher.debug} 字段控制。
 */
function createLogger(enabled: boolean = false): LoggerInstance & { enable: (v: boolean) => void } {
  let _enabled = enabled

  const prefixed = (level: 'debug' | 'info' | 'warn' | 'error', ...args: unknown[]) => {
    console[level](LOG_PREFIX, ...args)
  }

  return {
    enable(v: boolean) {
      _enabled = v
    },
    debug(...args: unknown[]) {
      if (_enabled) prefixed('debug', ...args)
    },
    info(...args: unknown[]) {
      if (_enabled) prefixed('info', ...args)
    },
    warn(...args: unknown[]) {
      if (_enabled) prefixed('warn', ...args)
    },
    error(...args: unknown[]) {
      prefixed('error', ...args)
    },
  }
}

export default createLogger
