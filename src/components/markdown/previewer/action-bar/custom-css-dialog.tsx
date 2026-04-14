import { Brush, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { trackEvent } from '@/lib/analytics'
import { usePreviewStore } from '@/stores/preview'

const CSS_EXAMPLES = `/* 修改标题颜色 */
#easymd h1 { color: #e74c3c; }
#easymd h2 { color: #3498db; }

/* 调整段落行高 */
#easymd p { line-height: 1.8; }

/* 自定义引用块样式 */
#easymd blockquote {
  border-left-color: #9b59b6;
  background: #f8f4fc;
}

/* 调整代码块圆角 */
#easymd pre { border-radius: 8px; }

/* 图片居中并添加阴影 */
#easymd img {
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}`

const MAX_CSS_LENGTH = 50000

export function CustomCssDialog() {
  const customCss = usePreviewStore(state => state.customCss)
  const setCustomCss = usePreviewStore(state => state.setCustomCss)
  const [localCss, setLocalCss] = useState(customCss)
  const [open, setOpen] = useState(false)
  const [examplesOpen, setExamplesOpen] = useState(false)

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setLocalCss(customCss)
    }
  }

  const handleSave = () => {
    setCustomCss(localCss)
    setOpen(false)
    trackEvent('style', 'custom-css', 'button')
  }

  const handleClear = () => {
    setLocalCss('')
  }

  const hasCustomCss = customCss.trim().length > 0
  const isOverLimit = localCss.length > MAX_CSS_LENGTH

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DialogTrigger
              render={(
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="自定义 CSS"
                >
                  <Brush className={hasCustomCss
                    ? 'size-4 text-primary'
                    : `size-4`}
                  />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>自定义 CSS</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>自定义 CSS</DialogTitle>
          <DialogDescription>
            CSS 选择器需约束在
            {' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">#easymd</code>
            {' '}
            下，在主题样式之后应用。
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={isOverLimit}>
            <FieldLabel htmlFor="custom-css" className="sr-only">
              自定义 CSS
            </FieldLabel>
            <Textarea
              id="custom-css"
              value={localCss}
              onChange={e => setLocalCss(e.target.value)}
              placeholder="输入自定义 CSS 样式..."
              className="max-h-60 min-h-40 font-mono text-xs"
            />
            <div className="flex items-center justify-between">
              <FieldDescription>
                {localCss.length.toLocaleString()}
                {' / '}
                {MAX_CSS_LENGTH.toLocaleString()}
                {' '}
                字符
              </FieldDescription>
              {isOverLimit && <FieldError>超出限制</FieldError>}
            </div>
          </Field>
          <Collapsible open={examplesOpen} onOpenChange={setExamplesOpen}>
            <CollapsibleTrigger
              render={(
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                >
                  <span>查看示例</span>
                  <ChevronDown className={`
                    size-4 transition-transform
                    ${examplesOpen
                  ? `rotate-180`
                  : ''}
                  `}
                  />
                </Button>
              )}
            />
            <CollapsibleContent>
              <pre className={`
                mt-2 max-h-48 overflow-auto rounded bg-muted p-3 font-mono
                text-xs
              `}
              >
                {CSS_EXAMPLES}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            清空
          </Button>
          <Button onClick={handleSave} disabled={isOverLimit}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
