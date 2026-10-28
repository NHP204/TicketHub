import winston from 'winston';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const readable = printf(({ level, message, timestamp: time, stack, ...meta }) => {
  const extra = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${time} ${level}: ${message}${extra}${stack ? `\n${stack}` : ''}`;
});

// production: JSON; development: dạng dễ đọc; test: tắt hẳn.
export function createLogger(nodeEnv = 'development') {
  const isProduction = nodeEnv === 'production';
  return winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    silent: nodeEnv === 'test',
    format: isProduction
      ? combine(timestamp(), errors({ stack: true }), json())
      : combine(colorize(), timestamp(), errors({ stack: true }), readable),
    transports: [new winston.transports.Console()],
  });
}
