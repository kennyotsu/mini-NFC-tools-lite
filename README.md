# Mini Release Editor Lite

Static, local-first proof of the Mini NFC Release editor core. It is deliberately limited to one development-only template and has no accounts, network storage, gallery, NFC, order flow, or backend.

## What it proves

- a domain document in millimetres, independent of UI libraries;
- a template package that owns geometry;
- one raster asset placed non-destructively on known physical surfaces;
- the same placement data driving 2D editing, 3D texture previews, print preview, and PDF output;
- a static build suitable for GitHub Pages.

The current template is `dev-mini-cd@0`, explicitly not a production template. The physical measurement checkpoint must replace it before any real manufacturing claim.

Every PDF produced by this template carries `DEV TEMPLATE — NOT FOR PRODUCTION`.

## Repository layout

```text
apps/lite                 Static React application for GitHub Pages
packages/editor-core      UI-independent document, transforms and layout math
packages/product-templates Development-only physical surface definitions
packages/print-engine     Browser PDF adapter consuming the shared layout
```

The full platform's future `apps/web` can import these packages without carrying over the Lite interface. A server export worker can replace `packages/print-engine`'s browser adapter while retaining the same document, template and print-layout contracts.

## Core contracts

`packages/editor-core` is pure TypeScript: it cannot import React, Konva, DOM APIs, Three, or PDF code. It owns the following portable data and calculations:

- `EditorDocument`: schema version and serializable surface-placement state only;
- `Placement`: `centerMm`, `sizeMm`, `rotationDeg`, `flipX`, `flipY` and `aspectLock`;
- `SurfaceRenderPlan`: one physical clipping/transform instruction derived from a surface and placement;
- `PrintLayout`: `{ pageSizeMm, placements, guides }`, built only from render plans;
- `mmToPdfPt(mm)`: the sole millimetre-to-PDF conversion.

`LiteSession` owns the resolved template identity and serializable `AssetRef` metadata; its UI adapter alone owns the DOM `File` and object URL. In the full product the same resolved template belongs to the parent DesignRevision. `packages/product-templates` owns immutable, versioned template definitions. Its general surface shape supports geometry, trim, bleed, safe area, fold/cut guides and `preview3dBinding`; `dev-mini-cd@0` merely instantiates rectangular geometry. Its print profile includes the Lite export PPI.

The browser adapter composes its temporary texture from `SurfaceRenderPlan`, then emits PDF from `PrintLayout`. A future server compositor/PDFKit adapter will consume those same contracts; it must never export a browser screenshot. The Lite's CSS 3D adapter consumes the browser-composited trim texture through `preview3dBinding`. Future R3F/GLB replaces that adapter and model only, never transform or layout math.

## Delivery stages

1. G0 — architecture audit: freeze scope, contracts, development-only template policy, and Pages release path.
   Exit: this document defines all contracts and intentional cuts; a Critic rates it at least 8/10.
2. G1 — static bootstrap: create the pnpm workspace, Vite React app, build command and GitHub Actions Pages shell.
   Exit: a production build works with an environment-sourced base path and has no root-absolute asset URLs.
3. G2 — domain core: implement the template, document schema, placement/render-plan math, `PrintLayout`, and focused pure-math verification fixtures.
   Exit: changing a placement produces identical geometry for preview and print layout.
4. G3 — 2D core: implement import, object-URL lifecycle, surface selection, canonical transform controls, and browser compositing.
   Exit: a single raster can be uploaded, moved, scaled, rotated and flipped non-destructively on known surfaces.
5. G4 — print core: render the shared A4 preview and emit a local PDF through the browser adapter.
   Exit: the PDF uses the shared physical layout, central mm-to-point conversion and development watermark.
6. G5 — 3D adapter: connect the composited trim textures to the CSS 3D preview through each surface's binding.
   Exit: all configured surfaces visually match their 2D composition without a second crop implementation.
7. G6 — release: typecheck/build, desktop smoke test, production-base-path smoke test, release notes and Pages workflow.
   Exit: the artifact is suitable for a GitHub Pages deployment from `main`.

Each completed stage is independently reviewed against its exit condition. A score below 8/10 triggers a focused correction and a new review; after three unsuccessful reviews, work stops for a user-facing retrospective.

## Intentional cuts

- one raster image asset per session, stored only in browser memory; its object URL is revoked when it is replaced or the page unmounts;
- rectangular surfaces only in this Lite build;
- mouse/trackpad desktop editor first;
- fixed A4 print layout and export PPI stored in the development template;
- CSS 3D preview instead of the full future R3F/GLB viewer;
- no local project save, undo/redo, bleed synthesis, booklet imposition or production calibration.

These cuts do not change the core data boundaries: `EditorDocument`, `ProductTemplate`, `Placement`, `SurfaceRenderPlan`, and `PrintLayout` remain portable contracts.

## Verification policy

Automated verification is restricted to high-leverage pure math: mm-to-point conversion, render-plan transform parity, and A4 layout. Everything else receives a short desktop smoke path: import a raster, change each transform, compare 2D/3D/print previews, export the PDF and inspect the page size and watermark. A physical 100% print check is recorded as a development proof only; it cannot validate manufacture until the measured ProductTemplate v1 exists.

## GitHub Pages release

1. Create an empty GitHub repository and push this repository to its `main` branch.
2. In GitHub Pages, choose **GitHub Actions** as the source.
3. Commit the workflow in `.github/workflows/deploy.yml`.
4. The workflow derives `VITE_BASE_PATH` from the GitHub repository name, so project-site asset paths need no manual edit.
5. The workflow verifies core geometry, typechecks, builds `apps/lite`, then deploys its `dist` output.

All asset URLs are emitted relative to that base path. Before release, run the production build with the expected repository path and open the generated output through a static server. The workflow uses the official Pages artifact/deployment actions and deploys only after the checks and static build succeed.
