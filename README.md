# Invoice reader (AI) for the Administration app

Reads an attached fuel invoice, delivery note or PO and returns the details. The app fills the empty
fuel-form fields and highlights them; a person checks them before saving.

## Run

    ANTHROPIC_API_KEY=your-key READER_TOKEN=a-long-random-secret APP_ORIGIN=https://your-app-host node server.js

Then, in index.html, set the two constants near the fuel form:

    let AI_READ_URL = 'https://your-server/api/read-invoice';
    let AI_READ_TOKEN = 'the same READER_TOKEN';

Leave AI_READ_URL empty and the button stays hidden.

## Settings (environment variables)

- ANTHROPIC_API_KEY: required. Stays on the server.
- READER_TOKEN: strongly recommended. Without it anyone who can reach the URL can use the key.
- APP_ORIGIN: the app's address, for CORS. Defaults to '*'.
- CLAUDE_MODEL: defaults to claude-sonnet-5-5.
- PORT: defaults to 8787.

## Before going live

- Host it somewhere with HTTPS (the app is served over HTTPS).
- Check the data policy: invoices are sent to the AI provider.
- Check the results on real invoices. The reader is a prototype; read values are not guaranteed.
- Replace READER_TOKEN with per-user sign-in (the app's Firebase login) before wider use.
