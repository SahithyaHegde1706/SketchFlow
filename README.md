# SketchFlow

SketchFlow is a browser-based whiteboard for drawing and arranging ideas on an interactive HTML Canvas. It supports local document autosave and downloads in PNG, SVG, and SketchFlow JSON formats.

## Features

### Drawing and editing

- Freehand pen, eraser, rectangles, rounded rectangles, circles, lines, arrows, and text
- Select and multi-select elements; move, resize, rotate, and delete them
- Copy, paste, and duplicate selections; group and ungroup; lock and unlock elements
- Reorder layers, with undo and redo support
- Keyboard shortcuts for common editing actions and selection nudging

### Canvas

- Pan with the hand tool or middle mouse button; zoom with the mouse wheel or zoom controls
- Choose a canvas background color and toggle the dot grid and its size
- Configure object snapping and grid snapping, with alignment guides
- Switch between light and dark application themes

### Images and text

- Insert images from local files; crop, resize, rotate, and flip them
- Adjust image opacity, corner radius, and shadow
- Set text color, font family, font size, bold, italic, underline, and alignment

### Documents and export

- Autosave to IndexedDB, with a localStorage fallback, and restore the saved board on startup
- Create a new document and rename the current board
- Download the board as PNG, SVG, or SketchFlow JSON

## Technology stack

- Next.js 16.3.4 with the App Router
- React 19.2.8 and TypeScript
- Tailwind CSS 4
- HTML Canvas API
- pnpm 11.3.0

## Project structure

```text
src/
├── app/                  # Landing page and board routes
├── components/
│   ├── board/
│   │   ├── canvas/       # Canvas UI, state, and interaction wiring
│   │   ├── header/
│   │   ├── layers/
│   │   ├── properties/
│   │   └── toolbar/
│   ├── brand/
│   ├── landing/
│   └── ThemeProvider.tsx
├── canvas/
│   ├── geometry/         # Canvas coordinates and bounds
│   ├── interaction/      # Hit testing and selection geometry
│   └── renderer/         # Canvas drawing for shapes, images, text, and overlays
├── clipboard/            # Copy, paste, and duplicate data
├── document/             # Document defaults, serialization, and autosave
│   └── autosave/         # Browser storage and validation
├── editor/               # Editing, snapping, grouping, and layering operations
├── export/               # PNG, SVG, and SketchFlow JSON export
│   └── svg/
├── history/              # Undo and redo history
├── hooks/                # Canvas viewport and keyboard hooks
└── types/                # Shared canvas, editor, and geometry types
```

## Canvas architecture

`BoardCanvas` connects React state and hooks to the canvas and delegates drawing, creation, selection, editing, keyboard, and pointer handling to focused modules. Canvas rendering is separated from editor operations and geometry helpers. History manages undo and redo snapshots; document modules handle serialization and local autosave; export modules generate PNG, SVG, and SketchFlow JSON downloads.

The board sidebar switches between selected-element properties and Canvas Settings. The toolbar, layers panel, and board header provide the surrounding editing controls.

## Getting started

Clone the repository, install dependencies, and start the development server:

```bash
git clone https://github.com/SahithyaHegde1706/SketchFlow.git
cd SketchFlow
pnpm install
pnpm dev
```

No environment variables are required by the current project configuration.

## Available scripts

- `pnpm dev` — start the development server
- `pnpm build` — create a production build
- `pnpm start` — serve the production build
- `pnpm lint` — run ESLint

To check TypeScript types, run `pnpm exec tsc --noEmit`.

## Project status

The repository includes the whiteboard drawing and editing tools, browser-based autosave and restore, and PNG, SVG, and SketchFlow JSON export. The codebase does not include a collaboration backend or a document import workflow.
