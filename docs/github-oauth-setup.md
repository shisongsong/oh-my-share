# GitHub OAuth 配置完整指南

## 步骤 1: 创建 GitHub OAuth App

1. 打开 https://github.com/settings/developers
2. 左侧点击 "OAuth Apps"
3. 点击 "New OAuth App"
4. 填写:
   - Application name: `Oh My Share`
   - Homepage URL: `https://openanthropic.com`
   - Authorization callback URL: `https://openanthropic.com/oauth/github/callback`
5. 点击 "Register application"

## 步骤 2: 获取凭据

1. 创建后会显示 Client ID（格式: `Ov23li...`）
2. 点击 "Generate a new client secret"
3. **立即复制 Client Secret**（只显示一次！）

## 步骤 3: 设置环境变量

```bash
# 设置 GitHub Client ID
npx wrangler secret put GITHUB_CLIENT_ID
# 粘贴你复制的 Client ID

# 设置 GitHub Client Secret
npx wrangler secret put GITHUB_CLIENT_SECRET
# 粘贴你复制的 Client Secret
```

## 步骤 4: 测试

1. 打开 https://openanthropic.com
2. 点击"登录 / 注册"
3. 点击"OAuth 登录"
4. 点击"Sign in with GitHub"
5. 授权后会跳转回主页并自动登录

## 常见问题

### 1. Callback URL 错误
- 必须完全匹配: `https://openanthropic.com/oauth/github/callback`
- 注意: 必须是 HTTPS，末尾没有斜杠

### 2. Client Secret 只显示一次
- 创建后立即复制保存
- 如果丢失，需要重新生成

### 3. 用户邮箱为空
- GitHub 允许用户隐藏邮箱
- 代码已处理这种情况（获取多个邮箱）
