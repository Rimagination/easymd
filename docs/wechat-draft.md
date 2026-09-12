# 微信公众号草稿箱同步

预览区的“同步到我的公众号草稿箱”支持多人使用。每个用户在自己的浏览器中授权一个公众号，文章只会写入当前已连接的公众号。

## 用户使用流程

1. 打开“同步到我的公众号草稿箱”。
2. 点击“连接我的公众号”。
3. 使用该公众号管理员微信扫码并确认授权。
4. 返回 easymd，填写文章信息并确认同步。

用户不需要填写 AppID、AppSecret、Vercel 环境变量或发布口令。浏览器只保存一个签名的匿名会话标识，公众号刷新凭据会在服务端加密后保存。

当前实现按浏览器绑定公众号。清除浏览器 Cookie 后，需要重新授权；同一用户在另一台设备上使用时，也需要在该设备重新授权。

## 站长一次性配置

### 1. 创建微信公众号第三方平台

在微信开放平台申请并完成认证，创建“公众号第三方平台”。平台的授权回调地址使用：

```text
https://你的域名/api/wechat/callback
```

平台的消息与事件接收 URL 使用：

```text
https://你的域名/api/wechat/component
```

在第三方平台中设置消息校验 Token、EncodingAESKey，并开通公众号草稿箱所需权限。微信授权流程说明见[官方文档](https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/Authorization_Process_Technical_Description.html)。

### 2. 配置 Vercel 环境变量

```text
VITE_APP_URL=https://你的域名

WECHAT_COMPONENT_APPID=第三方平台 AppID
WECHAT_COMPONENT_APPSECRET=第三方平台 AppSecret
WECHAT_COMPONENT_TOKEN=第三方平台消息校验 Token
WECHAT_COMPONENT_ENCODING_AES_KEY=第三方平台 EncodingAESKey
EASYMD_WECHAT_DATA_KEY=随机生成的至少 32 位服务端密钥
```

`EASYMD_WECHAT_DATA_KEY` 用于加密组件验证票据、公众号刷新凭据和短期 access_token。生成后要妥善保存，修改它会导致既有授权记录无法解密。

项目继续使用已有的 S3 兼容存储保存加密记录，因此以下变量必须保持可用：

```text
S3_ENDPOINT=...
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto
```

授权记录写入 `easymd-private/wechat/` 前会进行应用层加密。建议在 S3 中使用专用 Bucket，并设置拒绝公开读取的 Bucket 策略。
建议为 `easymd-private/wechat/oauth/` 设置 1 天的生命周期规则，自动清理用户取消授权后留下的短期状态。

### 3. 微信接口 IP 白名单

微信公众号接口可能要求服务器出口 IP 加入接口 IP 白名单。Vercel 默认出口 IP 可能变化，需要为生产 API 选择固定出口 IP 方案，或将授权与发布 API 部署到具有固定出口 IP 的服务上。

## 服务端流程

服务端先接收并保存微信第三方平台的 `component_verify_ticket`，再获取组件 access_token 和公众号预授权码。用户扫码后，回调接口会交换公众号授权码，保存该用户对应的 `authorizer_appid`、刷新凭据和公众号资料。发布时服务端按当前浏览器会话读取对应公众号的 access_token，然后上传正文图片、封面并创建草稿。

服务端不会向浏览器返回 AppSecret、刷新凭据或组件 access_token。

## 文章限制

正文少于 20,000 个字符、小于 1 MB，正文图片最多 20 张，单张正文图片小于 1 MB；单次 multipart 请求最多 16 MB。图片和微信接口请求均有 30 秒超时。

旧版的 `WECHAT_APPID`、`WECHAT_APPSECRET` 和 `EASYMD_WECHAT_PUBLISH_TOKEN` 已退出多人发布流程，保留它们不会改变用户授权行为。
