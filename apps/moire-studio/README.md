# Moiré Studio

A private, browser based generative art studio. Shape one of five procedural worlds, explore a palette, find a reproducible seed, and save the results to a local gallery.

## What makes it useful

- Five original canvas generators: contour field notes, orbital studies, night gardens, slow dunes, and afterglow.
- Five curated color stories, detail and motion controls, plus deterministic seeds.
- High resolution PNG export, recipe JSON import/export, and shareable recipe links.
- Local gallery with saved thumbnails, undo/redo, responsive controls, and keyboard shortcuts.
- No account, backend, analytics, or third party art assets. Recipes and saved images stay in browser storage.

## Use

Open [Moiré Studio](https://makhara184.github.io/makhara184/apps/moire-studio/) in a modern browser. The artwork is generated locally on a canvas; use **Export PNG** to save a 2× image. The “Copy share link” action puts the current recipe in the URL, so anyone with the link can recreate the same composition.

## Technology

Vanilla JavaScript, Canvas 2D, CSS, and browser storage. The app has no package dependencies or build step.

## Privacy and limits

The app stores recipes and gallery thumbnails on the current device. Browser storage can be cleared, so export recipes you want to keep. Share links contain only the recipe settings; they do not upload the artwork. Canvas performance varies by device and browser.