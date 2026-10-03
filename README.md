# SketchFlow

SketchFlow is a browser-based whiteboard for drawing, arranging, and editing ideas on a canvas.

## Features

### Drawing and editing
- Freehand drawing, rectangles, rounded rectangles, circles, lines, arrows, text, and images
- Selection and multi-selection, including automatic selection after creating an object and the `V` shortcut
- Move, resize, rotate, and delete objects
- Group and ungroup objects, lock and unlock them, and change their layer order
- Undo and redo, plus keyboard shortcuts for common editing actions
- Copy, paste, and duplicate selections

### Images and styling
- Add images from local files
- Crop, flip, resize, and rotate images; adjust opacity, borders, corner radius, and shadows
- Edit text formatting and object stroke and fill styles

### Canvas and navigation
- Pan with the hand tool or middle mouse button; zoom with the mouse wheel or zoom controls
- Set the canvas background and toggle the dot grid
- Use grid and object snapping with visual alignment guides

### Documents and export
- Autosave documents to local browser storage and restore them when the board opens
- Export the canvas as PNG or SVG
- Export the document as SketchFlow JSON
- Rename boards and switch between light and dark themes

## Technology stack

- Next.js 16.3.4 with the App Router
- React 19 and TypeScript
- Tailwind CSS 4
- HTML Canvas API

## Getting started

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

## Available scripts

- `pnpm dev` — start the development server
- `pnpm build` — create a production build
- `pnpm start` — serve the production build
- `pnpm lint` — run ESLint
- `pnpm exec tsc --noEmit` — check TypeScript types

## Project structure

- `src/app/` — application routes and global styles
- `src/components/` — landing page, board UI, and theme provider
- `src/canvas/` — canvas rendering, geometry, and interaction helpers
- `src/editor/` — drawing and editing operations, snapping, and keyboard shortcuts
- `src/document/` — document types, JSON export, and local persistence
- `src/export/` — PNG and SVG export
- `src/history/` — undo and redo history
- `src/clipboard/` — copy, paste, and duplicate state
- `src/hooks/` — canvas viewport and keyboard hooks
- `src/types/` — shared canvas types
