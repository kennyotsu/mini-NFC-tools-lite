import assert from 'node:assert/strict'
import { createCoverPlacement, createPrintLayout, createRenderPlan, mmToPdfPt, placementCoversGeometry, placementEffectivePpi, placementFromProjectedCenter, projectPlacement, validateEditorDocument, validateProductTemplate } from './index'
import type { EditorDocument, ProductTemplate } from './index'

const template: ProductTemplate = {
  identity: { formatKey: 'fixture', version: 0, developmentOnly: true },
  label: 'Fixture',
  printProfile: { ppi: 150, pageMarginMm: 8 },
  surfaces: [{
    key: 'front',
    label: 'Front',
    trim: { type: 'rect', rect: { xMm: 0, yMm: 0, widthMm: 62, heightMm: 62 } },
    bleed: { type: 'rect', rect: { xMm: -2, yMm: -2, widthMm: 66, heightMm: 66 } },
    cutLines: [{ fromMm: { x: 0, y: 0 }, toMm: { x: 66, y: 0 } }],
    preview3dBinding: 'case.front'
  }]
}

const document: EditorDocument = {
  schemaVersion: 1,
  surfaces: {
    front: {
      placement: {
        assetId: 'fixture-image',
        centerMm: { x: 23.5, y: 37.25 },
        sizeMm: { width: 83, height: 51 },
        rotationDeg: 17,
        flipX: true,
        flipY: false,
        aspectLock: true
      }
    }
  }
}

assert.deepEqual(validateProductTemplate(template), [])
assert.deepEqual(validateEditorDocument(template, document), [])
assert.equal(mmToPdfPt(25.4), 72)

const plan = createRenderPlan(template.surfaces[0], document.surfaces.front.placement)
const layout = createPrintLayout(template, document)
const projection = projectPlacement(document.surfaces.front.placement!, 4)
assert.deepEqual(layout.placements[0].renderPlan, plan)
assert.equal(layout.placements[0].renderPlan.placement?.rotationDeg, 17)
assert.equal(layout.placements[0].renderPlan.placement?.flipX, true)
assert.deepEqual(projection, { xPx: 94, yPx: 149, widthPx: 332, heightPx: 204, offsetXPx: 166, offsetYPx: 102, rotationDeg: 17, scaleX: -1, scaleY: 1 })
assert.deepEqual(placementFromProjectedCenter(document.surfaces.front.placement!, 200, 300, 4).centerMm, { x: 50, y: 75 })
assert.deepEqual(layout.placements[0].surfaceOriginOnPageMm, { x: 10, y: 10 })
assert.deepEqual(layout.guides[0].fromMm, { x: 10, y: 10 })
assert.deepEqual(layout.guides[0].toMm, { x: 72, y: 10 })
assert.deepEqual(layout.guides[4].toMm, { x: 76, y: 10 })

const asset = { id: 'cover', filename: 'cover.png', widthPx: 1200, heightPx: 1200 }
const coverPlacement = createCoverPlacement(template.surfaces[0], asset)
assert.equal(placementCoversGeometry(coverPlacement, template.surfaces[0].bleed), true)
assert.equal(Math.round(placementEffectivePpi(coverPlacement, asset)), 462)
