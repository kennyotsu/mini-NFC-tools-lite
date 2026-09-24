import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { createEmptyDocument, devMiniCdTemplate } from '@mini-release/product-templates'
import { createCoverPlacement, createPrintLayout, createRenderPlan, type EditorDocument } from '@mini-release/editor-core'
import { EditorCanvas, PlacementControls, uploadAsset } from './editor'
import { compositeRenderPlan } from './compositor'
import { createBrowserPdf, type PrintImageMap } from '@mini-release/print-engine'
import { PrintPreview } from './print-preview'
import { Preview3D } from './preview-3d'

const App = () => {
  const [document, setDocument] = useState<EditorDocument>(createEmptyDocument)
  const [activeSurfaceKey, setActiveSurfaceKey] = useState('front')
  const [asset, setAsset] = useState<Awaited<ReturnType<typeof uploadAsset>> | null>(null)
  const previousUrl = useRef<string | null>(null)
  const layout = useMemo(() => createPrintLayout(devMiniCdTemplate, document), [document])
  const printImages = useMemo<PrintImageMap>(() => {
    if (!asset) return {}
    return Object.fromEntries(devMiniCdTemplate.surfaces.map((surface) => {
      const plan = createRenderPlan(surface, document.surfaces[surface.key].placement)
      return [surface.key, compositeRenderPlan(plan, asset.image, devMiniCdTemplate.printProfile.ppi, 'bleed')]
    }))
  }, [asset, document])
  const previewTextures = useMemo<Record<string, string>>(() => {
    if (!asset) return {}
    return Object.fromEntries(devMiniCdTemplate.surfaces.map((surface) => {
      const plan = createRenderPlan(surface, document.surfaces[surface.key].placement)
      return [plan.preview3dBinding, compositeRenderPlan(plan, asset.image, devMiniCdTemplate.printProfile.ppi, 'trim')]
    }))
  }, [asset, document])

  useEffect(() => () => {
    if (previousUrl.current) URL.revokeObjectURL(previousUrl.current)
  }, [])

  const replaceAsset = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const next = await uploadAsset(file)
    if (previousUrl.current) URL.revokeObjectURL(previousUrl.current)
    previousUrl.current = next.url
    setAsset(next)
    setDocument((current) => ({
      ...current,
      surfaces: Object.fromEntries(devMiniCdTemplate.surfaces.map((surface) => [
        surface.key,
        { placement: createCoverPlacement(surface, next.ref) }
      ]))
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
        <div className="header-actions"><label className="import-button">Импортировать изображение<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && replaceAsset(event.target.files[0])} /></label><button type="button" className="export-button" disabled={!asset} onClick={exportPdf}>Экспорт PDF</button></div>
      </header>
      <section className="workspace">
        <aside className="surface-nav"><p className="panel-label">Поверхности</p>{devMiniCdTemplate.surfaces.map((surface) => <button type="button" className={activeSurfaceKey === surface.key ? 'active' : ''} key={surface.key} onClick={() => setActiveSurfaceKey(surface.key)}>{surface.label}</button>)}</aside>
        <section className="stage-panel"><EditorCanvas template={devMiniCdTemplate} document={document} activeSurfaceKey={activeSurfaceKey} asset={asset} onDocumentChange={setDocument} /><p className="stage-hint">Перетаскивайте изображение или задайте точные значения справа.</p></section>
        <aside className="inspector"><p className="panel-label">Размещение</p><PlacementControls document={document} activeSurfaceKey={activeSurfaceKey} onDocumentChange={setDocument} /><dl className="asset-facts"><dt>Шаблон</dt><dd>{devMiniCdTemplate.identity.formatKey}@{devMiniCdTemplate.identity.version}</dd><dt>Ассет</dt><dd>{asset ? `${asset.ref.filename} · ${asset.ref.widthPx} × ${asset.ref.heightPx}` : 'не загружен'}</dd></dl></aside>
      </section>
      <section className="preview-area"><div className="preview-copy"><p className="eyebrow">3D PREVIEW · TEXTURE BINDINGS</p><h2>Физический вид</h2><p>Текстуры создаются тем же browser compositor, что и печатный результат. Это не финальная фотореалистичная модель.</p><Preview3D template={devMiniCdTemplate} document={document} textures={previewTextures} /></div><div><p className="eyebrow">PRINT LAYOUT · A4</p><h2>Предпросмотр печати</h2><p className="print-copy">Фиксированная раскладка из общего PrintLayout. Не масштабируйте PDF при печати.</p><PrintPreview layout={layout} images={printImages} /></div></section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
