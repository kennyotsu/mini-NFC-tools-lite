import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { createEmptyDocument, devMiniCdTemplate } from '@mini-release/product-templates'
import { createCoverPlacement, createPrintLayout, createRenderPlan, placementCoversGeometry, placementEffectivePpi, type EditorDocument } from '@mini-release/editor-core'
import { EditorCanvas, PlacementControls, uploadAsset, type BrowserAsset } from './editor'
import { compositeRenderPlan } from './compositor'
import { createBrowserPdf, type PrintImageMap } from '@mini-release/print-engine'
import { PrintPreview } from './print-preview'
import { Preview3D } from './preview-3d'

const App = () => {
  const [document, setDocument] = useState<EditorDocument>(createEmptyDocument)
  const [activeSurfaceKey, setActiveSurfaceKey] = useState('front')
  const [assets, setAssets] = useState<Record<string, BrowserAsset | null>>(() => Object.fromEntries(devMiniCdTemplate.surfaces.map((surface) => [surface.key, null])))
  const objectUrls = useRef(new Set<string>())
  const layout = useMemo(() => createPrintLayout(devMiniCdTemplate, document), [document])
  const printImages = useMemo<PrintImageMap>(() => {
    return Object.fromEntries(devMiniCdTemplate.surfaces.map((surface) => {
      const asset = assets[surface.key]
      if (!asset) return [surface.key, undefined]
      const plan = createRenderPlan(surface, document.surfaces[surface.key].placement)
      return [surface.key, compositeRenderPlan(plan, asset.image, devMiniCdTemplate.printProfile.ppi, 'bleed')]
    }))
  }, [assets, document])
  const previewTextures = useMemo<Record<string, string | undefined>>(() => {
    return Object.fromEntries(devMiniCdTemplate.surfaces.map((surface) => {
      const asset = assets[surface.key]
      if (!asset) return [surface.preview3dBinding, undefined]
      const plan = createRenderPlan(surface, document.surfaces[surface.key].placement)
      return [plan.preview3dBinding, compositeRenderPlan(plan, asset.image, devMiniCdTemplate.printProfile.ppi, 'trim')]
    }))
  }, [assets, document])
  const printWarnings = useMemo(() => devMiniCdTemplate.surfaces.flatMap((surface) => {
    const asset = assets[surface.key]
    const placement = document.surfaces[surface.key].placement
    if (!asset || !placement) return [`${surface.label}: изображение не назначено.`]
    const warnings: string[] = []
    if (!placementCoversGeometry(placement, surface.bleed)) warnings.push(`${surface.label}: изображение не закрывает bleed.`)
    const effectivePpi = placementEffectivePpi(placement, asset.ref)
    if (effectivePpi < 300) warnings.push(`${surface.label}: ${Math.round(effectivePpi)} PPI, рекомендуется 300 PPI или больше.`)
    return warnings
  }), [assets, document])
  const hasEverySurfaceAsset = devMiniCdTemplate.surfaces.every((surface) => assets[surface.key])
  const activeSurface = devMiniCdTemplate.surfaces.find((surface) => surface.key === activeSurfaceKey)!

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const replaceAsset = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const next = await uploadAsset(file)
    const previous = assets[activeSurfaceKey]
    if (previous) {
      URL.revokeObjectURL(previous.url)
      objectUrls.current.delete(previous.url)
    }
    objectUrls.current.add(next.url)
    setAssets((current) => ({ ...current, [activeSurfaceKey]: next }))
    setDocument((current) => ({
      ...current,
      surfaces: {
        ...current.surfaces,
        [activeSurfaceKey]: { placement: createCoverPlacement(activeSurface, next.ref) }
      }
    }))
  }

  const exportPdf = () => {
    const url = URL.createObjectURL(createBrowserPdf(layout, printImages))
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = 'mini-release-dev-template.pdf'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">DEV TEMPLATE · LOCAL SESSION</p><h1>Mini Release Editor</h1></div>
        <div className="header-actions"><label className="import-button">Импортировать для: {activeSurface.label}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) replaceAsset(file)
          event.target.value = ''
        }} /></label><button type="button" className="export-button" disabled={!hasEverySurfaceAsset} onClick={exportPdf}>Экспорт PDF</button></div>
      </header>
      <section className="workspace">
        <aside className="surface-nav"><p className="panel-label">Поверхности</p>{devMiniCdTemplate.surfaces.map((surface) => <button type="button" className={activeSurfaceKey === surface.key ? 'active' : ''} key={surface.key} onClick={() => setActiveSurfaceKey(surface.key)}>{surface.label}</button>)}</aside>
        <section className="stage-panel"><EditorCanvas template={devMiniCdTemplate} document={document} activeSurfaceKey={activeSurfaceKey} asset={assets[activeSurfaceKey]} onDocumentChange={setDocument} /><p className="stage-hint">Перетаскивайте изображение или задайте точные значения справа.</p></section>
        <aside className="inspector"><p className="panel-label">Размещение</p><PlacementControls document={document} activeSurfaceKey={activeSurfaceKey} onDocumentChange={setDocument} /><dl className="asset-facts"><dt>Шаблон</dt><dd>{devMiniCdTemplate.identity.formatKey}@{devMiniCdTemplate.identity.version}</dd><dt>Ассет</dt><dd>{assets[activeSurfaceKey] ? `${assets[activeSurfaceKey]!.ref.filename} · ${assets[activeSurfaceKey]!.ref.widthPx} × ${assets[activeSurfaceKey]!.ref.heightPx}` : 'не загружен'}</dd></dl></aside>
      </section>
      <section className="preview-area"><div className="preview-copy"><p className="eyebrow">3D PREVIEW · TEXTURE BINDINGS</p><h2>Физический вид</h2><p>Текстуры создаются тем же browser compositor, что и печатный результат. Это не финальная фотореалистичная модель.</p><Preview3D template={devMiniCdTemplate} document={document} textures={previewTextures} /></div><div><p className="eyebrow">PRINT LAYOUT · A4</p><h2>Предпросмотр печати</h2><p className="print-copy">Линии реза выводятся и в этом предпросмотре, и в PDF. Не масштабируйте PDF при печати.</p><ul className="print-status">{printWarnings.length ? printWarnings.map((warning) => <li key={warning}>{warning}</li>) : <li>Все поверхности назначены, bleed закрыт, рекомендуемое разрешение достигнуто.</li>}</ul><PrintPreview layout={layout} images={printImages} /></div></section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
