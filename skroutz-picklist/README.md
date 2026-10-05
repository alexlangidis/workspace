# skroutz-picklist

Local-first PDF-to-picking-checklist MVP for Skroutz order exports. The app runs in the browser plus a Next.js route handler; it does not use WooCommerce, Skroutz APIs, external APIs, authentication, or a remote database.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a new order PDF, and scan or pick products from the checklist.

## PDF parsing

The app uses `pdfjs-dist` in the Node.js route handler at `app/api/parse-pdf/route.ts`. It reads the PDF text layer and table column positions, reconstructs wrapped titles and rows continuing across pages, handles split MPN/EAN text fragments, and extracts quantities from the quantity column. Category headings are identified by their table position and header, rather than product-title keywords. An incomplete product causes an explicit upload error instead of being silently omitted or mixed with the next row.

Run the sample parser check with:

```bash
npm run parse:sample
npm run parse:sample -- "/path/to/another-order.pdf"
npm run test:pdf
```

The sample PDF belongs at `samples/Παραγγελίες προς αποστολή.pdf`.

## Product images

The parser follows the PDF image transformation operators to locate each embedded photo. It matches photos to the corresponding product row by horizontal position and vertical overlap, excluding barcode images. A missing photo cannot shift other products' photos. PDF.js provides pixel buffers directly, which are encoded as local PNG data URLs without a native canvas renderer. An unavailable photo uses a placeholder.

## PWA and barcode scanner

The app is installable as a PWA from the browser menu. In production, a small service worker caches the app shell so an already-open checklist and its local progress remain available when the connection drops. Uploading a new PDF still needs the Next.js route to be reachable.

The `Συλλογή` button on each product opens a local `@zxing/browser` decoder for that product's EAN. A matching scan increments its picked quantity by one; a different barcode shows an error. All comparisons use the values extracted from the uploaded PDF.

Camera access requires HTTPS in production (localhost is also allowed by browsers).

## Local persistence

Parsed products, images and `pickedQuantity` are saved locally in IndexedDB, rather than serializing large image-heavy orders into the much smaller Web Storage quota. Uploads wait for the transaction to commit before opening the checklist. Saves and deletion are serialized; failed progress saves display a persistent warning with a retry button. Existing localStorage orders migrate automatically, preserving their progress and removing the old copy only after a successful commit. No remote database is used.

`Μηδενισμός προόδου` resets counts; `Νέα παραγγελία` clears the current order after confirmation. Browser storage is still finite and can be removed by the browser or user. Actual storage failures show an actionable message instead of silently losing progress.

## Checks

```bash
npm run typecheck
npm run lint
npm run test:pdf
npm run build
npm run test:storage
```
