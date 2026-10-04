# SketchFlow

SketchFlow is a browser-based whiteboard for drawing and arranging ideas on an interactive HTML Canvas. It supports local document autosave and downloads in PNG, SVG, and SketchFlow JSON formats.

## Features

### Drawing and editing

- Freehand pen, eraser, rectangles, rounded rectangles, circles, lines, arrows, and text
- Select and multi-select elements; move, resize, rotate, and delete them
- Copy, paste, and duplicate selections; lock and unlock elements
- Undo and redo support
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

## Screenshots:- 
<img width="1901" height="912" alt="image" src="https://github.com/user-attachments/assets/813a2e95-5dcc-4f36-b530-7864ffd09cdb" />

<img width="1903" height="907" alt="image" src="https://github.com/user-attachments/assets/4a03fdef-6beb-4a5a-8419-27008858ebf5" />

## Project status

The repository includes the whiteboard drawing and editing tools, browser-based autosave and restore, and PNG, SVG, and SketchFlow JSON export. The codebase does not include a collaboration backend or a document import workflow.
