import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../.qa/app.mjs';
const html=renderToString(React.createElement(App));
for (const text of ['FinStatement','Workspace Menu','Draft educational reports']) if(!html.includes(text)) throw new Error(`Missing UI text: ${text}`);
console.log('PASS: React server render of full application. This does not validate browser interactions or layout.');
