import type { ChangeEvent } from 'react'
import type { WechatDraftPublishResult, WechatDraftSession } from '@/services/wechat-draft'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { prepareWechatHtmlForCopy } from '@/lib/actions/copy-platform'
import { extractWechatDraftMetadata } from '@/lib/wechat-draft/metadata'
import {
  authenticateWechatDraft,
  getWechatDraftSession,
  publishWechatDraft,
} from '@/services/wechat-draft'
import { useFilesStore } from '@/stores/files'

const COVER_MEDIA_ID_STORAGE_KEY = 'easymd.wechat.cover-media-id'

interface WechatDraftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  getHtml: () => Promise<string>
}

interface HtmlStats {
  bytes: number
  chars: number
  images: number
}

function readStoredCoverMediaId(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.localStorage.getItem(COVER_MEDIA_ID_STORAGE_KEY) ?? ''
}

function getHtmlStats(html: string): HtmlStats {
  if (typeof DOMParser === 'undefined') {
    return { bytes: html.length, chars: 0, images: 0 }
  }

  const document = new DOMParser().parseFromString(html, 'text/html')
  return {
    bytes: new Blob([html]).size,
    chars: Array.from(document.body.textContent ?? '').length,
    images: document.querySelectorAll('img').length,
  }
}

function getFileFromChange(event: ChangeEvent<HTMLInputElement>): File | undefined {
  const file = event.target.files?.[0]
  if (!file) {
    return undefined
  }
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    toast.error('封面只支持 JPG 或 PNG 图片。')
    event.target.value = ''
    return undefined
  }
  return file
}

export function WechatDraftDialog({ open, onOpenChange, getHtml }: WechatDraftDialogProps) {
  const content = useFilesStore(state => state.currentContent)
  const [session, setSession] = useState<WechatDraftSession | null>(null)
  const [renderedHtml, setRenderedHtml] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [digest, setDigest] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [publishToken, setPublishToken] = useState('')
  const [coverFile, setCoverFile] = useState<File>()
  const [coverMediaId, setCoverMediaId] = useState('')
  const [showCoverPic, setShowCoverPic] = useState(false)
  const [needOpenComment, setNeedOpenComment] = useState(false)
  const [onlyFansCanComment, setOnlyFansCanComment] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<WechatDraftPublishResult | null>(null)

  const htmlStats = useMemo(() => getHtmlStats(renderedHtml), [renderedHtml])
  const hasCover = Boolean(coverFile || coverMediaId || session?.defaultCoverConfigured)
  const canSubmit = Boolean(
    session?.configured
    && (session.authenticated || publishToken.trim())
    && renderedHtml
    && title.trim()
    && hasCover
    && !loading
    && !preparing,
  )

  // The dialog is a reusable form: opening it starts a fresh draft from the current file.
  /* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
  useEffect(() => {
    if (!open) {
      return
    }

    let canceled = false
    const metadata = extractWechatDraftMetadata(content)
    setSession(null)
    setRenderedHtml('')
    setTitle(metadata.title)
    setAuthor(metadata.author)
    setDigest(metadata.digest)
    setSourceUrl(metadata.sourceUrl)
    setPublishToken('')
    setCoverFile(undefined)
    setCoverMediaId(readStoredCoverMediaId())
    setShowCoverPic(false)
    setNeedOpenComment(false)
    setOnlyFansCanComment(false)
    setLoading(false)
    setPreparing(true)
    setError('')
    setResult(null)

    void getWechatDraftSession()
      .then((nextSession) => {
        if (!canceled) {
          setSession(nextSession)
        }
      })
      .catch((nextError) => {
        if (!canceled) {
          setError(nextError instanceof Error ? nextError.message : '线上发布状态读取失败。')
        }
      })

    void getHtml()
      .then((html) => {
        if (!canceled) {
          setRenderedHtml(html)
        }
      })
      .catch((nextError) => {
        if (!canceled) {
          setError(nextError instanceof Error ? nextError.message : '文章渲染失败。')
        }
      })
      .finally(() => {
        if (!canceled) {
          setPreparing(false)
        }
      })

    return () => {
      canceled = true
    }
  }, [content, getHtml, open])
  /* eslint-enable react-hooks-extra/no-direct-set-state-in-use-effect */

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = getFileFromChange(event)
    if (file) {
      setCoverFile(file)
    }
  }

  const handleSubmit = async () => {
    if (!session?.configured) {
      setError('线上公众号接口尚未配置。')
      return
    }

    setLoading(true)
    setError('')
    try {
      let authenticatedSession = session
      if (!authenticatedSession.authenticated) {
        if (!publishToken.trim()) {
          throw new Error('请输入线上发布口令。')
        }
        authenticatedSession = await authenticateWechatDraft(publishToken.trim())
        setSession(authenticatedSession)
        setPublishToken('')
      }

      const html = renderedHtml || await getHtml()
      setPreparing(true)
      const preparedHtml = await prepareWechatHtmlForCopy(html)
      const published = await publishWechatDraft({
        author: author.trim(),
        cover: coverFile,
        coverMediaId: coverFile ? '' : coverMediaId,
        digest: digest.trim(),
        html: preparedHtml,
        needOpenComment,
        onlyFansCanComment,
        showCoverPic,
        sourceUrl: sourceUrl.trim(),
        title: title.trim(),
      })

      setResult(published)
      if (published.coverMediaId && typeof window !== 'undefined') {
        window.localStorage.setItem(COVER_MEDIA_ID_STORAGE_KEY, published.coverMediaId)
      }
      toast.success('已同步到微信草稿箱。')
    }
    catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '同步草稿箱失败。')
    }
    finally {
      setPreparing(false)
      setLoading(false)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (loading && !nextOpen) {
      return
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`
          max-h-[calc(100vh-2rem)] overflow-y-auto
          sm:max-w-xl
        `}
      >
        <DialogHeader>
          <DialogTitle>同步到微信公众号草稿箱</DialogTitle>
          <DialogDescription>
            文章会在服务端完成图片处理和草稿写入。这里不需要填写 AppID 或 AppSecret。
          </DialogDescription>
        </DialogHeader>

        {session?.configured && !session.authenticated && (
          <Field>
            <FieldLabel htmlFor="wechat-draft-publish-token">线上发布口令</FieldLabel>
            <Input
              id="wechat-draft-publish-token"
              type="password"
              value={publishToken}
              onChange={event => setPublishToken(event.target.value)}
              placeholder="请输入至少 32 个字符的线上发布口令"
              disabled={loading}
            />
            <FieldDescription>口令只用于建立短期发布会话，不会保存到浏览器。</FieldDescription>
          </Field>
        )}

        {session && !session.configured && (
          <Alert variant="destructive">
            <AlertTitle>线上发布尚未配置</AlertTitle>
            <AlertDescription>
              请先在 Vercel 配置 WECHAT_APPID、WECHAT_APPSECRET 和 EASYMD_WECHAT_PUBLISH_TOKEN。
            </AlertDescription>
          </Alert>
        )}

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="wechat-draft-title">标题</FieldLabel>
            <Input
              id="wechat-draft-title"
              value={title}
              maxLength={64}
              onChange={event => setTitle(event.target.value)}
              disabled={loading}
            />
            <FieldDescription>{`${title.length}/64`}</FieldDescription>
          </Field>

          <div
            className={`
              grid gap-4
              sm:grid-cols-2
            `}
          >
            <Field>
              <FieldLabel htmlFor="wechat-draft-author">作者</FieldLabel>
              <Input
                id="wechat-draft-author"
                value={author}
                maxLength={64}
                onChange={event => setAuthor(event.target.value)}
                placeholder="可选"
                disabled={loading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="wechat-draft-source-url">原文链接</FieldLabel>
              <Input
                id="wechat-draft-source-url"
                value={sourceUrl}
                onChange={event => setSourceUrl(event.target.value)}
                placeholder="可选"
                disabled={loading}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="wechat-draft-digest">摘要</FieldLabel>
            <Textarea
              id="wechat-draft-digest"
              value={digest}
              maxLength={120}
              onChange={event => setDigest(event.target.value)}
              placeholder="留空时由微信按正文生成"
              disabled={loading}
              rows={3}
            />
            <FieldDescription>{`${digest.length}/120`}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="wechat-draft-cover">封面</FieldLabel>
            <Input
              id="wechat-draft-cover"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleCoverChange}
              disabled={loading}
            />
            <FieldDescription>
              {coverFile?.name
                ? `本次使用：${coverFile.name}`
                : session?.defaultCoverConfigured
                  ? '服务端已配置默认封面。选择新图片可覆盖默认封面。'
                  : coverMediaId
                    ? '已保存上次使用的封面素材。选择新图片可更换。'
                    : '请上传 JPG 或 PNG 封面。'}
            </FieldDescription>
          </Field>

          <div
            className={`
              grid gap-2
              sm:grid-cols-2
            `}
          >
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={showCoverPic}
                onCheckedChange={checked => setShowCoverPic(checked === true)}
                disabled={loading}
              />
              正文显示封面图
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={needOpenComment}
                onCheckedChange={checked => setNeedOpenComment(checked === true)}
                disabled={loading}
              />
              开启评论
            </label>
            {needOpenComment && (
              <label
                className={`
                  flex items-center gap-2 text-xs
                  sm:col-span-2
                `}
              >
                <Checkbox
                  checked={onlyFansCanComment}
                  onCheckedChange={checked => setOnlyFansCanComment(checked === true)}
                  disabled={loading}
                />
                仅粉丝可评论
              </label>
            )}
          </div>
        </FieldGroup>

        {(preparing || renderedHtml) && !result && (
          <Alert>
            <AlertTitle>{preparing ? '正在准备文章' : '预检信息'}</AlertTitle>
            <AlertDescription>
              {preparing
                ? '正在渲染并准备图片，请稍候。'
                : `正文约 ${htmlStats.chars} 字，${htmlStats.images} 张图片，HTML ${Math.ceil(htmlStats.bytes / 1024)} KB。`}
            </AlertDescription>
          </Alert>
        )}

        {error && <FieldError>{error}</FieldError>}

        {result && (
          <Alert>
            <AlertTitle>草稿已写入</AlertTitle>
            <AlertDescription>
              {`草稿 ID：${result.draftMediaId}；正文图片：${result.imageCount} 张。`}
              {' '}
              <a href="https://mp.weixin.qq.com/" target="_blank" rel="noreferrer">
                打开公众号后台
              </a>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            {result ? '完成' : '取消'}
          </Button>
          {!result && (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {loading ? '同步中...' : '确认同步'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
