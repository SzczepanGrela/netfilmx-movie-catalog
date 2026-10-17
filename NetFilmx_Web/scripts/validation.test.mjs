import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

async function form(message = 'Email is required.') {
  const dom = new JSDOM(`<form><input name="Email" data-val="true"
    data-val-required="" data-val-email="Invalid email.">
    <span data-valmsg-for="Email" data-valmsg-replace="true"></span></form>`,
    { runScripts: 'outside-only', url: 'https://example.test/' });
  dom.window.document.querySelector('input').setAttribute('data-val-required', message);
  for (const path of [
    '../wwwroot/lib/jquery/dist/jquery.min.js',
    '../wwwroot/lib/jquery-validation/dist/jquery.validate.min.js'
  ]) dom.window.eval(await readFile(new URL(path, import.meta.url), 'utf8'));
  const partial = await readFile(new URL('../Views/Shared/_ValidationScriptsPartial.cshtml', import.meta.url), 'utf8');
  for (const [, script] of partial.matchAll(/<script>([\s\S]*?)<\/script>/g)) dom.window.eval(script);
  dom.window.eval(await readFile(new URL('../wwwroot/lib/jquery-validation-unobtrusive/jquery.validate.unobtrusive.min.js', import.meta.url), 'utf8'));
  const $ = dom.window.jQuery;
  $.validator.unobtrusive.parse(dom.window.document);
  // jsdom does not perform layout, so otherwise all inputs are considered hidden.
  $('form').data('validator').settings.ignore = [];
  return { dom, $ };
}

test('validation messages are text even when they contain attacker HTML', async () => {
  const message = '<img src=x onerror="alert(1)">';
  const { dom, $ } = await form(message);
  try {
    assert.equal($('form').valid(), false);
    const error = dom.window.document.querySelector('[data-valmsg-for="Email"]');
    assert.equal(error.textContent, message);
    assert.equal(error.querySelector('img'), null);
  } finally { dom.window.close(); }
});

test('unobtrusive validation accepts a valid email', async () => {
  const { dom, $ } = await form();
  try {
    $('input').val('viewer@example.test');
    assert.equal($('form').valid(), true);
  } finally { dom.window.close(); }
});

test('unobtrusive validation rejects a malformed email', async () => {
  const { dom, $ } = await form();
  try {
    $('input').val('invalid-email');
    assert.equal($('form').valid(), false);
    assert.equal(dom.window.document.querySelector('[data-valmsg-for="Email"]').textContent, 'Invalid email.');
  } finally { dom.window.close(); }
});
