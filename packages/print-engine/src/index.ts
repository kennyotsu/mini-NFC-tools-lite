import { jsPDF } from 'jspdf'
import { mmToPdfPt, type PrintLayout } from '@mini-release/editor-core'

export type PrintImageMap = Record<string, string | undefined>

export const createBrowserPdf = (layout: PrintLayout, images: PrintImageMap) => {
  const pdf = new jsPDF({
    unit: 'pt',
    format: [mmToPdfPt(layout.pageSizeMm.width), mmToPdfPt(layout.pageSizeMm.height)]
  })
  for (const placement of layout.placements) {
    const image = images[placement.surfaceKey]
    if (!image) continue
    pdf.addImage(
      image,
      'PNG',
      mmToPdfPt(placement.rectMm.xMm),
      mmToPdfPt(placement.rectMm.yMm),
      mmToPdfPt(placement.rectMm.widthMm),
      mmToPdfPt(placement.rectMm.heightMm)
    )
  }
  pdf.setLineWidth(0.35)
  for (const guide of layout.guides) {
    pdf.setDrawColor(guide.kind === 'cut' ? 80 : 30, guide.kind === 'cut' ? 80 : 90, guide.kind === 'cut' ? 80 : 170)
    pdf.line(mmToPdfPt(guide.fromMm.x), mmToPdfPt(guide.fromMm.y), mmToPdfPt(guide.toMm.x), mmToPdfPt(guide.toMm.y))
  }
  pdf.setTextColor(125, 20, 30)
  pdf.setFontSize(8)
  pdf.text('DEV TEMPLATE — NOT FOR PRODUCTION', mmToPdfPt(8), mmToPdfPt(289))
  return pdf.output('blob')
}
