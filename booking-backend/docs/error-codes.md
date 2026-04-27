# 后端错误码与错误信息对照表

本文档列出 booking-backend 返回给前端的所有错误状态码和对应的错误信息。

## 1. 认证模块 (Auth Module)

### 1.1 注册 (POST /v1/auth/register)

| HTTP 状态码 | 错误场景 | 错误信息 | 前端处理建议 |
|------------|---------|---------|------------|
| 400 | 请求体验证失败 | `Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character` | 显示密码强度要求 |
| 400 | 请求体验证失败 | `Password must be at least 8 characters long` | 提示密码长度要求 |
| 400 | 请求体验证失败 | `Please provide a valid email address` | 提示邮箱格式错误 |
| 400 | 请求体验证失败 | `Name is required` | 提示姓名为必填项 |
| 400 | 请求体验证失败 | `Name must be at least 2 characters long` | 提示姓名长度要求 |
| 400 | 请求体验证失败 | `Please provide a valid phone number` | 提示手机号格式错误（如提供） |
| 409 | 邮箱已存在 | `Email already exists` | 提示用户邮箱已被注册 |
| 429 | 请求频率超限 | `Too many requests. Please try again later.` | 提示用户稍后重试 |
| 500 | 服务器内部错误 | `Internal server error` | 显示通用错误提示 |

**密码要求：**
- 至少 8 个字符
- 至少一个大写字母 (A-Z)
- 至少一个小写字母 (a-z)
- 至少一个数字 (0-9)
- 至少一个特殊字符 (@$!%*?&)

### 1.2 登录 (POST /v1/auth/login)

| HTTP 状态码 | 错误场景 | 错误信息 | 前端处理建议 |
|------------|---------|---------|------------|
| 400 | 请求体验证失败 | `email must be a valid email` | 提示邮箱格式错误 |
| 400 | 请求体验证失败 | `password should not be empty` | 提示密码为必填项 |
| 401 | 邮箱或密码错误 | `Invalid credentials` | 显示登录失败提示 |
| 401 | 账户已禁用 | `Account is disabled` | 提示联系管理员 |
| 429 | 请求频率超限 | `Too many requests. Please try again later.` | 提示用户稍后重试 |
| 500 | 服务器内部错误 | `Internal server error` | 显示通用错误提示 |

### 1.3 刷新令牌 (POST /v1/auth/refresh)

| HTTP 状态码 | 错误场景 | 错误信息 | 前端处理建议 |
|------------|---------|---------|------------|
| 400 | 缺少刷新令牌 | `Refresh token is required` | 重定向到登录页 |
| 401 | 刷新令牌无效 | `Invalid refresh token` | 清除本地存储，重定向到登录页 |
| 401 | 刷新令牌已过期 | `Refresh token expired` | 清除本地存储，重定向到登录页 |
| 500 | 服务器内部错误 | `Internal server error` | 显示通用错误提示 |

### 1.4 登出 (POST /v1/auth/logout)

| HTTP 状态码 | 错误场景 | 错误信息 | 前端处理建议 |
|------------|---------|---------|------------|
| 401 | 未认证 | `Unauthorized` | 重定向到登录页 |
| 500 | 服务器内部错误 | `Internal server error` | 显示通用错误提示 |

## 2. 预订模块 (Bookings Module)

### 2.1 创建预订 (POST /v1/bookings)

| HTTP 状态码 | 错误场景 | 错误信息 | 前端处理建议 |
|------------|---------|---------|------------|
| 400 | 请求体验证失败 | 具体字段验证错误 | 显示对应字段错误 |
| 401 | 未认证 | `Unauthorized` | 重定向到登录页 |
| 404 | 时间段不存在 | `Time slot not found` | 提示时间段不可用 |
| 409 | 时间段已被预订 | `Time slot already booked` | 提示选择其他时间段 |
| 429 | 请求频率超限 | `Too many requests. Please try again later.` | 提示用户稍后重试 |
| 500 | 服务器内部错误 | `Internal server error` | 显示通用错误提示 |

### 2.2 获取预订列表 (GET /v1/bookings)

| HTTP 状态码 | 错误场景 | 错误信息 | 前端处理建议 |
|------------|---------|---------|------------|
| 401 | 未认证 | `Unauthorized` | 重定向到登录页 |
| 500 | 服务器内部错误 | `Internal server error` | 显示通用错误提示 |

### 2.3 取消预订 (DELETE /v1/bookings/:id)

| HTTP 状态码 | 错误场景 | 错误信息 | 前端处理建议 |
|------------|---------|---------|------------|
| 401 | 未认证 | `Unauthorized` | 重定向到登录页 |
| 403 | 无权限取消 | `Forbidden: You can only cancel your own bookings` | 提示无权限操作 |
| 404 | 预订不存在 | `Booking not found` | 提示预订已被删除 |
| 500 | 服务器内部错误 | `Internal server error` | 显示通用错误提示 |

## 3. 时间段模块 (Time Slots Module)

### 3.1 获取时间段列表 (GET /v1/time-slots)

| HTTP 状态码 | 错误场景 | 错误信息 | 前端处理建议 |
|------------|---------|---------|------------|
| 400 | 参数验证失败 | `date must be a valid ISO date string` | 提示日期格式错误 |
| 500 | 服务器内部错误 | `Internal server error` | 显示通用错误提示 |

## 4. 通用错误码

| HTTP 状态码 | 错误场景 | 错误信息 | 前端处理建议 |
|------------|---------|---------|------------|
| 400 | 请求体格式错误 | `Bad Request` | 检查请求格式 |
| 401 | 未认证 | `Unauthorized` | 重定向到登录页 |
| 403 | 无权限 | `Forbidden` | 提示无权限访问 |
| 404 | 资源不存在 | `Not Found` | 提示资源不存在 |
| 429 | 请求频率超限 | `Too Many Requests` | 提示稍后重试 |
| 500 | 服务器内部错误 | `Internal Server Error` | 显示通用错误提示 |
| 503 | 服务不可用 | `Service Unavailable` | 提示服务维护中 |

## 5. 错误响应格式

所有错误响应都遵循以下格式：

```json
{
  "statusCode": 400,
  "message": "具体错误信息或错误信息数组",
  "error": "错误类型",
  "timestamp": "2026-04-16T16:23:04.011Z",
  "path": "/v1/auth/register"
}
```

**验证错误示例（多个字段错误）：**
```json
{
  "statusCode": 400,
  "message": [
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    "Password must be at least 8 characters long"
  ],
  "error": "Bad Request",
  "timestamp": "2026-04-16T16:23:04.011Z",
  "path": "/v1/auth/register"
}
```

**单一错误示例：**
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict",
  "timestamp": "2026-04-16T16:23:04.011Z",
  "path": "/v1/auth/register"
}
```

## 6. 前端错误处理最佳实践

1. **4xx 客户端错误**：
   - 400：显示表单验证错误
   - 401：清除 token，重定向到登录页
   - 403：显示权限不足提示
   - 404：显示资源不存在提示
   - 429：显示频率限制提示，建议稍后重试

2. **5xx 服务器错误**：
   - 显示通用错误提示
   - 记录错误日志（开发环境）
   - 提供重试选项

3. **网络错误**：
   - `ERR_INTERNET_DISCONNECTED`：检查网络连接
   - `ERR_CONNECTION_REFUSED`：检查后端服务是否运行

## 7. 前端错误处理代码示例

```typescript
this.api.register({ name, email, password }).subscribe({
  next: (response) => {
    // 处理成功响应
    this.router.navigate(['/booking']);
  },
  error: (err) => {
    let errorMessage = 'Registration failed';
    
    // 处理验证错误（数组格式）
    if (err.error?.message && Array.isArray(err.error.message)) {
      errorMessage = err.error.message.join('; ');
    } 
    // 处理单一错误消息
    else if (err.error?.message) {
      errorMessage = err.error.message;
    }
    // 处理网络错误
    else if (err.status === 0) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    this.authStore.setError(errorMessage);
  },
});
```
