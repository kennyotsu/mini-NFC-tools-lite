export type MmPoint = { x: number; y: number }

export type Rect = { xMm: number; yMm: number; widthMm: number; heightMm: number }

export type Geometry =
  | { type: 'rect'; rect: Rect }
  | { type: 'circle'; cxMm: number; cyMm: number; radiusMm: number }
  | { type: 'polygon'; pointsMm: MmPoint[] }
  | { type: 'path'; svgPath: string; boundsMm: Rect }

export type SurfaceTemplate = {
  key: string
  label: string
  trim: Geometry
  bleed: Geometry
  safe?: Geometry
  cutLines?: Array<{ fromMm: MmPoint; toMm: MmPoint }>
  foldLines?: Array<{ fromMm: MmPoint; toMm: MmPoint }>
  preview3dBinding: string
}

export type ProductTemplate = {
  identity: { formatKey: string; version: number; developmentOnly: boolean }
  label: string
  printProfile: { ppi: number; pageMarginMm: number }
  surfaces: SurfaceTemplate[]
}

export type AssetRef = { id: string; widthPx: number; heightPx: number; filename: string }

export type Placement = {
  assetId: string
  centerMm: MmPoint
  sizeMm: { width: number; height: number }
  rotationDeg: number
  flipX: boolean
  flipY: boolean
  aspectLock: boolean
}

export type ArtworkSlot = { placement: Placement | null }

export type EditorDocument = {
  schemaVersion: 1
  surfaces: Record<string, ArtworkSlot>
}

export type LiteSession = {
  template: ProductTemplate['identity']
  assets: Record<string, AssetRef | null>
  document: EditorDocument
}

export type SurfaceRenderPlan = {
  surfaceKey: string
  trim: Geometry
  bleed: Geometry
  placement: Placement | null
  preview3dBinding: string
  localOriginMm: MmPoint
}

export type PrintPlacement = {
  surfaceKey: string
  rectMm: Rect
  surfaceOriginOnPageMm: MmPoint
  renderPlan: SurfaceRenderPlan
}

export type PrintGuide = { surfaceKey: string; kind: 'cut' | 'fold'; fromMm: MmPoint; toMm: MmPoint }

export type PrintLayout = {
  pageSizeMm: { width: number; height: number }
  placements: PrintPlacement[]
  guides: PrintGuide[]
}

export type PlacementProjection = {
  xPx: number
  yPx: number
  widthPx: number
  heightPx: number
  offsetXPx: number
  offsetYPx: number
  rotationDeg: number
  scaleX: 1 | -1
  scaleY: 1 | -1
}

export const mmToPdfPt = (mm: number) => (mm * 72) / 25.4

export const geometryBounds = (geometry: Geometry): Rect => {
  if (geometry.type === 'rect') return geometry.rect
  if (geometry.type === 'circle') {
    return {
      xMm: geometry.cxMm - geometry.radiusMm,
      yMm: geometry.cyMm - geometry.radiusMm,
      widthMm: geometry.radiusMm * 2,
      heightMm: geometry.radiusMm * 2
    }
  }
  if (geometry.type === 'path') return geometry.boundsMm
  const xValues = geometry.pointsMm.map((point) => point.x)
  const yValues = geometry.pointsMm.map((point) => point.y)
  const xMm = Math.min(...xValues)
  const yMm = Math.min(...yValues)
  return { xMm, yMm, widthMm: Math.max(...xValues) - xMm, heightMm: Math.max(...yValues) - yMm }
}

const isFiniteNumber = (value: number) => Number.isFinite(value)

export const validateGeometry = (geometry: Geometry): string[] => {
  if (geometry.type === 'rect') {
    return [geometry.rect.xMm, geometry.rect.yMm, geometry.rect.widthMm, geometry.rect.heightMm].every(isFiniteNumber) && geometry.rect.widthMm > 0 && geometry.rect.heightMm > 0
      ? []
      : ['Rectangle dimensions must be finite and positive.']
  }
  if (geometry.type === 'circle') {
    return [geometry.cxMm, geometry.cyMm, geometry.radiusMm].every(isFiniteNumber) && geometry.radiusMm > 0
      ? []
      : ['Circle dimensions must be finite and positive.']
  }
  if (geometry.type === 'polygon') {
    return geometry.pointsMm.length >= 3 && geometry.pointsMm.every((point) => isFiniteNumber(point.x) && isFiniteNumber(point.y))
      ? []
      : ['Polygon must have at least three finite points.']
  }
  return geometry.svgPath.trim() && [geometry.boundsMm.xMm, geometry.boundsMm.yMm, geometry.boundsMm.widthMm, geometry.boundsMm.heightMm].every(isFiniteNumber) && geometry.boundsMm.widthMm > 0 && geometry.boundsMm.heightMm > 0
    ? []
    : ['Path geometry requires a path and positive bounds.']
}

export const validateProductTemplate = (template: ProductTemplate): string[] => {
  const keys = new Set<string>()
  const errors = template.surfaces.flatMap((surface) => {
    const duplicate = keys.has(surface.key)
    keys.add(surface.key)
    return [
      ...validateGeometry(surface.trim).map((error) => `${surface.key}.trim: ${error}`),
      ...validateGeometry(surface.bleed).map((error) => `${surface.key}.bleed: ${error}`),
      ...(surface.safe ? validateGeometry(surface.safe).map((error) => `${surface.key}.safe: ${error}`) : []),
      ...(surface.cutLines ?? []).flatMap((line) => validateGuide(line, `${surface.key}.cut`)),
      ...(surface.foldLines ?? []).flatMap((line) => validateGuide(line, `${surface.key}.fold`)),
      ...(duplicate ? [`Duplicate surface key: ${surface.key}.`] : []),
      ...(!surface.preview3dBinding.trim() ? [`Missing preview binding: ${surface.key}.`] : [])
    ]
  })
  return template.printProfile.ppi > 0 && template.printProfile.pageMarginMm >= 0
    ? errors
    : [...errors, 'Print profile must have positive PPI and a non-negative margin.']
}

const validateGuide = (line: { fromMm: MmPoint; toMm: MmPoint }, prefix: string) => {
  return [line.fromMm.x, line.fromMm.y, line.toMm.x, line.toMm.y].every(isFiniteNumber) ? [] : [`${prefix}: guide points must be finite.`]
}

export const validateEditorDocument = (template: ProductTemplate, document: EditorDocument): string[] => {
  const errors = document.schemaVersion === 1 ? [] : ['Unsupported document schema version.']
  const allowed = new Set(template.surfaces.map((surface) => surface.key))
  for (const key of Object.keys(document.surfaces)) {
    if (!allowed.has(key)) errors.push(`Unknown surface slot: ${key}.`)
  }
  for (const surface of template.surfaces) {
    const placement = document.surfaces[surface.key]?.placement
    if (!document.surfaces[surface.key]) errors.push(`Missing surface slot: ${surface.key}.`)
    if (placement && (
      placement.assetId.length === 0 ||
      placement.sizeMm.width <= 0 ||
      placement.sizeMm.height <= 0 ||
      ![placement.centerMm.x, placement.centerMm.y, placement.sizeMm.width, placement.sizeMm.height, placement.rotationDeg].every(isFiniteNumber)
    )) {
      errors.push(`Invalid placement: ${surface.key}.`)
    }
  }
  return errors
}

export const createRenderPlan = (surface: SurfaceTemplate, placement: Placement | null): SurfaceRenderPlan => ({
  surfaceKey: surface.key,
  trim: surface.trim,
  bleed: surface.bleed,
  placement,
  preview3dBinding: surface.preview3dBinding,
  localOriginMm: { x: 0, y: 0 }
})

export const createCoverPlacement = (surface: SurfaceTemplate, asset: AssetRef): Placement => {
  const bounds = geometryBounds(surface.bleed)
  const assetRatio = asset.widthPx / asset.heightPx
  const surfaceRatio = bounds.widthMm / bounds.heightMm
  const sizeMm = assetRatio > surfaceRatio
    ? { width: bounds.heightMm * assetRatio, height: bounds.heightMm }
    : { width: bounds.widthMm, height: bounds.widthMm / assetRatio }
  return {
    assetId: asset.id,
    centerMm: { x: bounds.xMm + bounds.widthMm / 2, y: bounds.yMm + bounds.heightMm / 2 },
    sizeMm,
    rotationDeg: 0,
    flipX: false,
    flipY: false,
    aspectLock: true
  }
}

export const placementEffectivePpi = (placement: Placement, asset: AssetRef) => {
  const widthPpi = (asset.widthPx * 25.4) / placement.sizeMm.width
  const heightPpi = (asset.heightPx * 25.4) / placement.sizeMm.height
  return Math.min(widthPpi, heightPpi)
}

export const placementCoversGeometry = (placement: Placement, geometry: Geometry) => {
  const bounds = geometryBounds(geometry)
  const radians = (-placement.rotationDeg * Math.PI) / 180
  const corners = [
    { x: bounds.xMm, y: bounds.yMm },
    { x: bounds.xMm + bounds.widthMm, y: bounds.yMm },
    { x: bounds.xMm, y: bounds.yMm + bounds.heightMm },
    { x: bounds.xMm + bounds.widthMm, y: bounds.yMm + bounds.heightMm }
  ]
  return corners.every((corner) => {
    const x = corner.x - placement.centerMm.x
    const y = corner.y - placement.centerMm.y
    const localX = x * Math.cos(radians) - y * Math.sin(radians)
    const localY = x * Math.sin(radians) + y * Math.cos(radians)
    return Math.abs(localX) <= placement.sizeMm.width / 2 && Math.abs(localY) <= placement.sizeMm.height / 2
  })
}

export const projectPlacement = (placement: Placement, pixelsPerMm: number): PlacementProjection => {
  const widthPx = placement.sizeMm.width * pixelsPerMm
  const heightPx = placement.sizeMm.height * pixelsPerMm
  return {
    xPx: placement.centerMm.x * pixelsPerMm,
    yPx: placement.centerMm.y * pixelsPerMm,
    widthPx,
    heightPx,
    offsetXPx: widthPx / 2,
    offsetYPx: heightPx / 2,
    rotationDeg: placement.rotationDeg,
    scaleX: placement.flipX ? -1 : 1,
    scaleY: placement.flipY ? -1 : 1
  }
}

export const placementFromProjectedCenter = (placement: Placement, xPx: number, yPx: number, pixelsPerMm: number): Placement => ({
  ...placement,
  centerMm: { x: xPx / pixelsPerMm, y: yPx / pixelsPerMm }
})

export const createPrintLayout = (template: ProductTemplate, document: EditorDocument): PrintLayout => {
  const templateErrors = validateProductTemplate(template)
  const documentErrors = validateEditorDocument(template, document)
  if (templateErrors.length || documentErrors.length) throw new Error([...templateErrors, ...documentErrors].join(' '))
  const margin = template.printProfile.pageMarginMm
  let cursorX = margin
  let cursorY = margin
  let rowHeight = 0
  const placements: PrintPlacement[] = []
  const guides: PrintGuide[] = []

  for (const surface of template.surfaces) {
    const bounds = geometryBounds(surface.bleed)
    if (cursorX + bounds.widthMm > 210 - margin) {
      cursorX = margin
      cursorY += rowHeight + margin
      rowHeight = 0
    }
    if (cursorY + bounds.heightMm > 297 - margin) throw new Error(`A4 layout overflow at surface: ${surface.key}.`)
    const renderPlan = createRenderPlan(surface, document.surfaces[surface.key]?.placement ?? null)
    placements.push({
      surfaceKey: surface.key,
      rectMm: { xMm: cursorX, yMm: cursorY, widthMm: bounds.widthMm, heightMm: bounds.heightMm },
      surfaceOriginOnPageMm: { x: cursorX - bounds.xMm, y: cursorY - bounds.yMm },
      renderPlan
    })
    const trimBounds = geometryBounds(surface.trim)
    const trimCorners = [
      { x: trimBounds.xMm, y: trimBounds.yMm },
      { x: trimBounds.xMm + trimBounds.widthMm, y: trimBounds.yMm },
      { x: trimBounds.xMm + trimBounds.widthMm, y: trimBounds.yMm + trimBounds.heightMm },
      { x: trimBounds.xMm, y: trimBounds.yMm + trimBounds.heightMm }
    ]
    for (let index = 0; index < trimCorners.length; index += 1) {
      const from = trimCorners[index]
      const to = trimCorners[(index + 1) % trimCorners.length]
      guides.push({
        surfaceKey: surface.key,
        kind: 'cut',
        fromMm: { x: from.x + cursorX - bounds.xMm, y: from.y + cursorY - bounds.yMm },
        toMm: { x: to.x + cursorX - bounds.xMm, y: to.y + cursorY - bounds.yMm }
      })
    }
    guides.push(...(surface.cutLines ?? []).map((line) => ({
      surfaceKey: surface.key,
      kind: 'cut' as const,
      fromMm: { x: line.fromMm.x + cursorX - bounds.xMm, y: line.fromMm.y + cursorY - bounds.yMm },
      toMm: { x: line.toMm.x + cursorX - bounds.xMm, y: line.toMm.y + cursorY - bounds.yMm }
    })))
    guides.push(...(surface.foldLines ?? []).map((line) => ({
      surfaceKey: surface.key,
      kind: 'fold' as const,
      fromMm: { x: line.fromMm.x + cursorX - bounds.xMm, y: line.fromMm.y + cursorY - bounds.yMm },
      toMm: { x: line.toMm.x + cursorX - bounds.xMm, y: line.toMm.y + cursorY - bounds.yMm }
    })))
    cursorX += bounds.widthMm + margin
    rowHeight = Math.max(rowHeight, bounds.heightMm)
  }

  return { pageSizeMm: { width: 210, height: 297 }, placements, guides }
}
