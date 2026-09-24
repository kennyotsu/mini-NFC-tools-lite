import { geometryBounds, projectPlacement, type Geometry, type SurfaceRenderPlan } from '@mini-release/editor-core'

export const compositeRenderPlan = (plan: SurfaceRenderPlan, image: HTMLImageElement, ppi: number, region: 'trim' | 'bleed') => {
  const geometry: Geometry = plan[region]
  const bounds = geometryBounds(geometry)
  if (geometry.type !== 'rect') throw new Error('Lite compositor currently supports rectangular surfaces only.')
  const pixelsPerMm = ppi / 25.4
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bounds.widthMm * pixelsPerMm)
  canvas.height = Math.round(bounds.heightMm * pixelsPerMm)
  const context = canvas.getContext('2d')!
  context.fillStyle = '#171925'
  context.fillRect(0, 0, canvas.width, canvas.height)
  if (!plan.placement) return canvas.toDataURL('image/png')
  const projection = projectPlacement(plan.placement, pixelsPerMm)
  context.save()
  context.translate(projection.xPx - bounds.xMm * pixelsPerMm, projection.yPx - bounds.yMm * pixelsPerMm)
  context.rotate((projection.rotationDeg * Math.PI) / 180)
  context.scale(projection.scaleX, projection.scaleY)
  context.drawImage(image, -projection.offsetXPx, -projection.offsetYPx, projection.widthPx, projection.heightPx)
  context.restore()
  return canvas.toDataURL('image/png')
}
