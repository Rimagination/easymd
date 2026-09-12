# 微信公众号草稿箱同步

网页预览区的“同步到草稿箱”按钮会把当前文章提交到微信公众号草稿箱。AppID、AppSecret、微信 access_token 和图片处理都在服务端完成，浏览器只持有一个短期 HttpOnly 会话。

## Vercel 配置

在部署项目中配置以下服务端环境变量：

```text
WECHAT_APPID=公众号 AppID
WECHAT_APPSECRET=公众号 AppSecret
EASYMD_WECHAT_PUBLISH_TOKEN=至少 32 个字符的随机长口令
```

可选配置：

```text
WECHAT_DEFAULT_COVER_MEDIA_ID=公众号中的永久封面素材 media_id
WECHAT_IMAGE_HOSTS=cdn.example.com,images.example.com
```

`WECHAT_IMAGE_HOSTS` 用于允许服务端读取正文中的远程图片。项目自身的 `VITE_APP_URL`、`VITE_API_URL`、S3 公共地址和 DC 图床地址会自动加入白名单；其他图片域名需要显式填写。

服务端始终拒绝 localhost、回环地址、私有网段、链路本地地址和多播地址，不会把请求 Host 自动加入图片白名单。

微信公众号后台还需要把线上服务的固定出口 IP 加入“接口 IP 白名单”。Vercel 部署建议使用可提供固定出口 IP 的方案；出口 IP 变化时，微信接口可能返回 `40164`。

## 使用方式

打开网页预览区的“同步到草稿箱”，首次输入发布口令，然后确认标题、作者、摘要、原文链接和封面。封面素材的 `media_id` 会保存在浏览器本地，后续文章可以复用；口令不会写入 localStorage。

服务端会先把正文图片上传为微信图文图片，再上传封面永久素材，最后调用 `draft/add` 创建草稿。正文限制按微信接口执行：正文少于 20,000 个字符、小于 1 MB，正文图片最多 20 张，单张正文图片小于 1 MB；单次 multipart 请求最多 16 MB。图片和微信接口请求均有 30 秒超时。

发布口令要求至少 32 个字符，连续失败会在当前服务实例内暂时限流；生产环境仍建议在 Vercel/WAF 层启用请求限速。
