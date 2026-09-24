import type { EditorDocument, ProductTemplate } from '@mini-release/editor-core'

const rect = (widthMm: number, heightMm: number) => ({
  type: 'rect' as const,
  rect: { xMm: 0, yMm: 0, widthMm, heightMm }
})

export const devMiniCdTemplate: ProductTemplate = {
  identity: { formatKey: 'dev-mini-cd', version: 0, developmentOnly: true },
  label: 'Dev Mini CD',
  printProfile: { ppi: 150, pageMarginMm: 8 },
  surfaces: [
    { key: 'front', label: 'Front insert', trim: rect(62, 62), bleed: rect(66, 66), preview3dBinding: 'case.front' },
    { key: 'rear', label: 'Rear insert', trim: rect(62, 62), bleed: rect(66, 66), preview3dBinding: 'case.rear' },
    { key: 'tray', label: 'Tray card', trim: rect(62, 62), bleed: rect(66, 66), preview3dBinding: 'case.tray' }
  ]
}

export const createEmptyDocument = (): EditorDocument => ({
  schemaVersion: 1,
  surfaces: Object.fromEntries(devMiniCdTemplate.surfaces.map((surface) => [surface.key, { placement: null }]))
})
