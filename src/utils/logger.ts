// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// 日志接口
export interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  source?: string
}

// 简单的日志工具
export class Logger {
  private static instance: Logger
  private logLevel: LogLevel = LogLevel.INFO

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (level < this.logLevel) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      source
    }

    const levelName = LogLevel[level]
    const logMessage = `[${entry.timestamp}] ${levelName}: ${message}`
    
    if (data) {
      console.log(logMessage, data)
    } else {
      console.log(logMessage)
    }
  }

  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source)
  }

  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source)
  }

  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source)
  }

  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source)
  }
}

// 导出单例实例
export const logger = Logger.getInstance()