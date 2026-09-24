import { createRenderPlan, type EditorDocument, type ProductTemplate } from '@mini-release/editor-core'

type Preview3DProps = { template: ProductTemplate; document: EditorDocument; textures: Record<string, string> }

export const Preview3D = ({ template, document, textures }: Preview3DProps) => {
  const textureFor = (binding: string) => {
    const surface = template.surfaces.find((item) => item.preview3dBinding === binding)
    if (!surface) return undefined
    return textures[createRenderPlan(surface, document.surfaces[surface.key].placement).preview3dBinding]
  }

  return (
    <section className="preview-3d" aria-label="3D предпросмотр мини-релиза">
      <div className="case-3d">
        <div className="case-face case-front" style={{ backgroundImage: textureFor('case.front') ? `url(${textureFor('case.front')})` : undefined }} />
        <div className="case-face case-back" style={{ backgroundImage: textureFor('case.rear') ? `url(${textureFor('case.rear')})` : undefined }} />
        <div className="case-face case-tray" style={{ backgroundImage: textureFor('case.tray') ? `url(${textureFor('case.tray')})` : undefined }} />
      </div>
      <p>Упрощённый CSS‑адаптер. R3F/GLB позже заменит только эту визуализацию.</p>
    </section>
  )
}
