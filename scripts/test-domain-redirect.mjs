import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const code = await readFile(new URL('../infra/www-to-apex.js', import.meta.url), 'utf8')
const { handler } = runInNewContext(`${code}\n({ handler })`)
const request = (host, uri = '/', querystring = {}) => ({ method: 'GET', uri, headers: { host: { value: host } }, querystring })
for (const host of ['pereme.com.tr', 'd2bmjk2h6qp4lz.cloudfront.net', 'www.pereme.com.tr.evil.test']) {
  const input = request(host)
  assert.equal(handler({ request: input }), input)
}
assert.equal(handler({ request: request('www.pereme.com.tr') }).headers.location.value, 'https://pereme.com.tr/')
const result = handler({ request: request('www.pereme.com.tr', '/turlar/sunset', {
  utm_source: { value: 'summer%20cruise' },
  tag: { value: 'one', multiValue: [{ value: 'one' }, { value: 'two' }] },
  empty: { value: '' }, next: { value: 'https%3A%2F%2Fexample.test%2Fa%3Fx%3D1%26y%3D2' },
}) })
assert.equal(result.statusCode, 308)
assert.equal(result.headers.location.value, 'https://pereme.com.tr/turlar/sunset?utm_source=summer%20cruise&tag=one&tag=two&empty=&next=https%3A%2F%2Fexample.test%2Fa%3Fx%3D1%26y%3D2')
assert.equal(result.headers['cache-control'].value, 'private,no-store')
console.log('Domain redirect checks passed: exact host, test origin unchanged, path, repeated/empty/encoded query values, no external redirect.')
