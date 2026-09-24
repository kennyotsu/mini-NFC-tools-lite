import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Image as KonvaImage, Layer, Rect, Stage } from 'react-konva'
import type { AssetRef, EditorDocument, Placement, ProductTemplate } from '@mini-release/editor-core'
import { geometryBounds, placementFromProjectedCenter, projectPlacement } from '@mini-release/editor-core'

type BrowserAsset = { ref: AssetRef; url: string; image: HTMLImageElement }

type EditorProps = {
  template: ProductTemplate
  document: EditorDocument
  activeSurfaceKey: string
  asset: BrowserAsset | null
  onDocumentChange: (next: EditorDocument) => void
}

const canvasScale = 4

const patchPlacement = (document: EditorDocument, key: string, patch: Partial<Placement>) => ({
  ...document,
  surfaces: {
    ...document.surfaces,
    [key]: { placement: { ...document.surfaces[key].placement!, ...patch } }
  }
})

export const uploadAsset = async (file: File): Promise<BrowserAsset> => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  await image.decode()
  return {
    url,
    image,
    ref: { id: crypto.randomUUID(), filename: file.name, widthPx: image.naturalWidth, heightPx: image.naturalHeight }
  }
}

export const EditorCanvas = ({ template, document, activeSurfaceKey, asset, onDocumentChange }: EditorProps) => {
  const surface = template.surfaces.find((item) => item.key === activeSurfaceKey)!
  const bounds = geometryBounds(surface.trim)
  const placement = document.surfaces[activeSurfaceKey].placement
  const [dragging, setDragging] = useState(false)

  const imageProps = useMemo(() => {
    if (!asset || !placement) return null
    const projection = projectPlacement(placement, canvasScale)
    return {
      x: projection.xPx,
      y: projection.yPx,
      width: projection.widthPx,
      height: projection.heightPx,
      offsetX: projection.offsetXPx,
      offsetY: projection.offsetYPx,
      rotation: projection.rotationDeg,
      scaleX: projection.scaleX,
      scaleY: projection.scaleY
    }
  }, [asset, placement])

  useEffect(() => () => setDragging(false), [activeSurfaceKey])

  return (
    <section className="editor-canvas" aria-label={`Рабочая область: ${surface.label}`}>
      <Stage width={bounds.widthMm * canvasScale} height={bounds.heightMm * canvasScale}>
        <Layer>
          <Rect width={bounds.widthMm * canvasScale} height={bounds.heightMm * canvasScale} fill="#171925" />
          {imageProps && asset && (
            <KonvaImage
              image={asset.image}
              {...imageProps}
              draggable
              onDragStart={() => setDragging(true)}
              onDragEnd={(event) => {
                onDocumentChange(patchPlacement(document, activeSurfaceKey, placementFromProjectedCenter(placement!, event.target.x(), event.target.y(), canvasScale)))
                setDragging(false)
              }}
            />
          )}
          <Rect width={bounds.widthMm * canvasScale} height={bounds.heightMm * canvasScale} stroke={dragging ? '#d7ff6e' : '#7980a1'} strokeWidth={1} listening={false} />
        </Layer>
      </Stage>
    </section>
  )
}

export const PlacementControls = ({ document, activeSurfaceKey, onDocumentChange }: Pick<EditorProps, 'document' | 'activeSurfaceKey' | 'onDocumentChange'>) => {
  const placement = document.surfaces[activeSurfaceKey].placement
  if (!placement) return <p className="empty-state">Загрузите изображение, чтобы начать.</p>

  const numberChange = (key: keyof Placement, nested?: keyof Placement['centerMm'] | keyof Placement['sizeMm']) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    if (!Number.isFinite(value)) return
    if (key === 'centerMm' || key === 'sizeMm') {
      const nextSize = key === 'sizeMm' && nested === 'width' && placement.aspectLock
        ? { width: value, height: value / (placement.sizeMm.width / placement.sizeMm.height) }
        : { ...placement[key], [nested!]: value }
      onDocumentChange(patchPlacement(document, activeSurfaceKey, { [key]: nextSize }))
      return
    }
    onDocumentChange(patchPlacement(document, activeSurfaceKey, { [key]: value }))
  }

  return (
    <div className="control-stack">
      <label>Позиция X, мм<input type="number" value={placement.centerMm.x} step="0.5" onChange={numberChange('centerMm', 'x')} /></label>
      <label>Позиция Y, мм<input type="number" value={placement.centerMm.y} step="0.5" onChange={numberChange('centerMm', 'y')} /></label>
      <label>Ширина, мм<input type="number" min="1" value={placement.sizeMm.width} step="0.5" onChange={numberChange('sizeMm', 'width')} /></label>
      <label>Угол<input type="range" min="-180" max="180" value={placement.rotationDeg} onChange={numberChange('rotationDeg')} /><output>{placement.rotationDeg}°</output></label>
      <div className="toggle-row">
        <button type="button" aria-pressed={placement.flipX} onClick={() => onDocumentChange(patchPlacement(document, activeSurfaceKey, { flipX: !placement.flipX }))}>Зеркально X</button>
        <button type="button" aria-pressed={placement.flipY} onClick={() => onDocumentChange(patchPlacement(document, activeSurfaceKey, { flipY: !placement.flipY }))}>Зеркально Y</button>
      </div>
    </div>
  )
}
