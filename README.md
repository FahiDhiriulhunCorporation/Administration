# Invoice reader (AI) for the Administration app

Reads documents and returns their details. The app fills the matching form and highlights what it filled;
a person checks the values before saving.

Two document kinds are supported:
- `fuel-invoice`: a fuel invoice, delivery note or PO (fuel entry form: date, litres, rate, total, delivery note no., PO no., supplier).
- `pr-quotation`: a supplier quotation or proposal (purchase requisition form: each priced item fills an item line).

The quotation is also saved with the requisition, so it can be opened later.

## Files

- `server.js`: the reader on its own (Node, no extra packages). Use this on any server.
- `firebase/`: the same reader as a Firebase Cloud Function. NOT deployed or tested here; see the notes in `firebase/index.js`.
- `test.js`: checks the reader against a fake AI service (no key needed).

## Run on a server

    ANTHROPIC_API_KEY=your-key READER_TOKEN=a-long-random-secret APP_ORIGIN=https://your-app-host node server.js

## Connect the app

In index.html, set these two constants near the fuel form:

    let AI_READ_URL = 'https://your-server/api/read-invoice';   // or the Firebase function address
    let AI_READ_TOKEN = 'the same READER_TOKEN';

Leave AI_READ_URL empty and the AI buttons stay hidden.

## Settings

- ANTHROPIC_API_KEY: required. Stays on the server.
- READER_TOKEN: strongly recommended. Without it, anyone with the address can use the key.
- APP_ORIGIN: the app's address, for CORS. Defaults to '*'.
- CLAUDE_MODEL: defaults to claude-sonnet-5-5.
- PORT: defaults to 8787.

## Before going live

- Host it over HTTPS.
- Confirm the data policy: invoices and quotations are sent to the AI provider.
- Test on real documents. Read values are not guaranteed; the app always asks for a person to check them.
- Replace the shared token with each user's sign-in (the app's Firebase login).
