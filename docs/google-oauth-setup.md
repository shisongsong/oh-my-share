# Google OAuth 配置完整指南

## 步骤 1: 创建 Google Cloud 项目

1. 打开 https://console.cloud.google.com/
2. 点击顶部项目选择器 → "新建项目"
3. 项目名称: `oh-my-share`（随意）
4. 点击"创建"

## 步骤 2: 配置 OAuth 同意屏幕

1. 左侧菜单 → API 和服务 → OAuth 同意屏幕
2. 选择"外部" → 点击"创建"
3. 填写:
   - 应用名称: `Oh My Share`
   - 用户支持邮箱: 你的邮箱
   - 开发者联系信息: 你的邮箱
4. 点击"保存并继续"
5. 范围页面: 点击"添加或移除范围" → 勾选 `email` 和 `profile` → 点击"更新" → "保存并继续"
6. 测试用户页面: 点击"添加用户" → 输入你的 Google 邮箱 → "添加"
7. 点击"保存并继续" → "返回信息中心"

## 步骤 3: 创建 OAuth 凭据

1. 左侧菜单 → API 和服务 → 凭据
2. 点击"+ 创建凭据" → "OAuth 客户端 ID"
3. 应用类型: "Web 庑用"
4. 名称: `Oh My Share Web`
5. 已获授权的重定向 URI: 添加 `https://openanthropic.com/oauth/google/callback`
6. 点击"创建"
7. **复制 Client ID 和 Client Secret**

## 步骤 4: 设置环境变量

```bash
# 设置 Google Client ID
npx wrangler secret put GOOGLE_CLIENT_ID
# 粘贴你复制的 Client ID

# 设置 Google Client Secret
npx wrangler secret put GOOGLE_CLIENT_SECRET
# 粘贴你复制的 Client Secret
```

## 步骤 5: 测试

1. 打开 https://openanthropic.com
2. 点击"登录 / 注册"
3. 点击"OAuth 登录"
4. 点击"Sign in with Google"
5. 选择你的 Google 账号登录
6. 应该会跳转回主页并自动登录

## 常见问题

### 1. 提示"此应用未经验证"
- 这是正常的，因为你的应用还在测试阶段
- 点击"高级" → "继续访问（不安全）"

### 2. 重定向 URI 错误
- 确保 Google Cloud Console 中的重定向 URI 完全正确:
  `https://openanthropic.com/oauth/google/callback`
- 注意: 必须是 HTTPS，末尾没有斜杠

### 3. 无法获取用户信息
- 确保已启用 People API:
  1. API 和服务 → 库
  2. 搜索 "People API"
  3. 点击"启用"

### 4. Client ID 和 Secret 不同
- Client ID 格式类似: `123456789-xxxx.apps.googleusercontent.com`
- Client Secret 格式类似: `GOCSPX-xxxxxxxx`
