export function PreviewerFallback() {
  return (
    <div className={`
      flex h-full w-full flex-col items-center justify-center bg-background/50
      p-4 backdrop-blur-sm select-none
    `}
    >
      <p className="doto-font text-5xl font-bold text-muted-foreground/25">
        easymd
      </p>
      <p className="mt-3 text-xs text-muted-foreground">预览加载中...</p>
    </div>
  )
}
