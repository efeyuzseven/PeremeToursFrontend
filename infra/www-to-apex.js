// CloudFront Function (not Lambda). Only redirect the explicit www alias.
// CloudFront provides query names/values URL-encoded: do not encode them twice.
function handler(event) {
  var request = event.request;
  if (!request.headers.host || request.headers.host.value.toLowerCase() !== 'www.pereme.com.tr') return request;
  var query = request.querystring || {};
  var parts = [];
  Object.keys(query).forEach(function (name) {
    var values = query[name].multiValue || [query[name]];
    values.forEach(function (item) { parts.push(name + '=' + item.value); });
  });
  var suffix = parts.length ? '?' + parts.join('&') : '';
  return {
    statusCode: 308,
    statusDescription: 'Permanent Redirect',
    headers: {
      location: { value: 'https://pereme.com.tr' + request.uri + suffix },
      'cache-control': { value: 'private,no-store' }
    }
  };
}
