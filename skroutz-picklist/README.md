# skroutz-picklist

Local-first PDF-to-picking-checklist MVP for Skroutz order exports. The app runs entirely in the browser plus a local Next.js route handler; it does not use WooCommerce, Skroutz APIs, external APIs, authentication, or a database.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a new order PDF, and scan or pick products from the checklist.

## PDF parsing

The app uses [`pdfjs-dist`](https://www.npmjs.com/package/pdfjs-dist) in the Node.js route handler at `app/api/parse-pdf/route.ts`. It reads the PDF text layer, groups text by page coordinates, reconstructs wrapped titles, handles split EAN text fragments, detects MPN/EAN fields, preserves category transitions, and extracts quantities formatted like `1 ×` or `2 ×`.

Run the sample parser check with:

```bash
npm run parse:sample
```

The sample PDF belongs at `samples/Παραγγελίες προς αποστολή.pdf`.

## Product images

The parser inspects the embedded image operators and selects the larger image in each Skroutz row (the smaller companion image is the barcode). PDF.js provides the RGB pixel buffers directly in this export, so the MVP encodes those product images as local PNG data URLs. If a future PDF export does not expose an image buffer, the row safely falls back to a placeholder and text parsing still succeeds.

## Local persistence and scanner input

Parsed products and `pickedQuantity` are saved in `localStorage`, so a refresh keeps progress. `Μηδενισμός προόδου` resets counts; `Νέα παραγγελία` clears the current order after confirmation.

The dark `Σκάναρε EAN...` field behaves like a USB/Bluetooth keyboard scanner input. A scanner can type the EAN and press Enter; matching products increment by one, never beyond their required quantity. Unknown EANs and already-complete products show immediate feedback.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```
