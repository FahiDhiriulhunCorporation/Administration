// Firebase Cloud Functions wrapper for the invoice reader.
// NOT DEPLOYED OR TESTED in this environment: check it with the Firebase emulator before deploying.
// Setup (once):  firebase functions:secrets:set ANTHROPIC_API_KEY  and  firebase functions:secrets:set READER_TOKEN
// Then:          firebase deploy --only functions:readInvoice
// The app's AI_READ_URL becomes https://<region>-<project>.cloudfunctions.net/readInvoice
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { handler } = require('./server');

const anthropicKey = defineSecret('ANTHROPIC_API_KEY');
const readerToken = defineSecret('READER_TOKEN');
const reader = handler();

exports.readInvoice = onRequest({ secrets: [anthropicKey, readerToken] }, (req, res) => {
  process.env.ANTHROPIC_API_KEY = anthropicKey.value();
  process.env.READER_TOKEN = readerToken.value();
  process.env.APP_ORIGIN = process.env.APP_ORIGIN || '*';
  req.url = '/api/read-invoice';   // the function's own address is the whole path
  return reader(req, res);
});
