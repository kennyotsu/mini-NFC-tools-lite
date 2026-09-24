import type { PrintImageMap } from '@mini-release/print-engine'
import type { PrintLayout } from '@mini-release/editor-core'

type PrintPreviewProps = { layout: PrintLayout; images: PrintImageMap }

const previewScale = 1.45

export const PrintPreview = ({ layout, images }: PrintPreviewProps) => (
  <section className="print-preview-wrap" aria-label="Предпросмотр листа A4">
    <div className="a4-sheet" style={{ width: layout.pageSizeMm.width * previewScale, height: layout.pageSizeMm.height * previewScale }}>
      {layout.placements.map((placement) => <div
        className="print-piece"
        key={placement.surfaceKey}
        style={{
          left: placement.rectMm.xMm * previewScale,
          top: placement.rectMm.yMm * previewScale,
          width: placement.rectMm.widthMm * previewScale,
          height: placement.rectMm.heightMm * previewScale,
          backgroundImage: images[placement.surfaceKey] ? `url(${images[placement.surfaceKey]})` : undefined
        }}
      />)}
      <svg className="print-guides" viewBox={`0 0 ${layout.pageSizeMm.width} ${layout.pageSizeMm.height}`} aria-hidden="true">
        {layout.guides.map((guide, index) => <line
          className={`print-guide ${guide.kind}`}
          key={`${guide.surfaceKey}-${guide.kind}-${index}`}
          x1={guide.fromMm.x}
          y1={guide.fromMm.y}
          x2={guide.toMm.x}
          y2={guide.toMm.y}
        />)}
      </svg>
      <p className="dev-watermark">DEV TEMPLATE — NOT FOR PRODUCTION</p>
    </div>
  </section>
)
