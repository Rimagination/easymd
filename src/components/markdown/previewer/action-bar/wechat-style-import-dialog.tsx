import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { importWechatArticle } from '@/lib/actions'
import { parseWechatArticleUrl } from '@/lib/wechat-import'

interface WechatStyleImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WechatStyleImportDialog({
  open,
  onOpenChange,
}: WechatStyleImportDialogProps) {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const parsed = url.trim() ? parseWechatArticleUrl(url) : null
  const error = parsed && !parsed.ok ? parsed.error : ''
  const canSubmit = Boolean(parsed?.ok) && !submitting

  const handleSubmit = async () => {
    const parsedUrl = parseWechatArticleUrl(url)
    if (!parsedUrl.ok) {
      toast.error(parsedUrl.error)
      return
    }

    setSubmitting(true)
    try {
      await importWechatArticle(parsedUrl.url)
      setUrl('')
      onOpenChange(false)
    }
    catch (error) {
      toast.error(error instanceof Error ? error.message : '公众号文章导入失败。')
    }
    finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>从公众号生成主题（开发中）</DialogTitle>
          <DialogDescription>
            输入单篇公开微信公众号文章链接。easymd 会导入正文 Markdown，并生成一个相似气质的原创主题草稿；第一版不镜像图片。
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="wechat-article-url">
              文章链接
            </FieldLabel>
            <Input
              id="wechat-article-url"
              value={url}
              onChange={event => setUrl(event.target.value)}
              placeholder="https://mp.weixin.qq.com/s/..."
              disabled={submitting}
            />
            <FieldDescription>
              仅支持你主动输入的一篇公开公众号文章；导入结果会保留来源信息。
            </FieldDescription>
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <Sparkles className="size-4" />
            {submitting ? '生成中...' : '导入并生成主题'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
