import * as fs from 'fs';

/**
 * JWT 密钥加载策略（支持 Docker Secrets 文件 + 环境变量回退）
 *
 * 加载优先级：
 *   1. Docker Secrets 文件 /run/secrets/jwt_secret（容器生产环境）
 *   2. JWT_SECRET 环境变量
 *   3. 抛出错误（强制要求密钥）
 *
 * @throws Error 当密钥不可用时
 */
export function loadJwtSecret(): string {
  const dockerSecretPath = '/run/secrets/jwt_secret';
  if (fs.existsSync(dockerSecretPath)) {
    const secret = fs.readFileSync(dockerSecretPath, 'utf8').trim();
    if (secret) return secret;
  }
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) return envSecret;
  throw new Error(
    'JWT_SECRET is not configured. Set the JWT_SECRET environment variable or mount a Docker Secret at /run/secrets/jwt_secret',
  );
}

/**
 * Refresh Token 密钥加载策略（支持 Docker Secrets 文件 + 环境变量回退）
 *
 * @throws Error 当密钥不可用时
 */
export function loadJwtRefreshSecret(): string {
  const dockerSecretPath = '/run/secrets/jwt_refresh_secret';
  if (fs.existsSync(dockerSecretPath)) {
    const secret = fs.readFileSync(dockerSecretPath, 'utf8').trim();
    if (secret) return secret;
  }
  const envSecret = process.env.JWT_REFRESH_SECRET;
  if (envSecret) return envSecret;
  throw new Error(
    'JWT_REFRESH_SECRET is not configured. Set the JWT_REFRESH_SECRET environment variable or mount a Docker Secret at /run/secrets/jwt_refresh_secret',
  );
}
