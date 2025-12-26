'use strict';

// Minimal subset of the popular `cookie` package (MIT licensed) to avoid external downloads.
// Implements `serialize` and `parse` used for session cookies.

function serialize(name, val, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;

  if (typeof enc !== 'function') {
    throw new TypeError('option encode is invalid');
  }

  if (!name) throw new TypeError('cookie name is required');
  if (/[\u0000-\u001F\u007F()<>@,;:\\"/[\]?={} \t]/.test(name)) {
    throw new TypeError('cookie name is invalid');
  }

  const value = enc(String(val));
  if (/[\u0000-\u001F\u007F]/.test(value)) {
    throw new TypeError('cookie value is invalid');
  }

  let str = `${name}=${value}`;

  if (opt.maxAge != null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge)) throw new TypeError('maxAge should be a Number');
    str += `; Max-Age=${Math.floor(maxAge)}`;
  }

  if (opt.domain) {
    if (!/^\.?[^\s]+$/.test(opt.domain)) throw new TypeError('option domain is invalid');
    str += `; Domain=${opt.domain}`;
  }

  if (opt.path) {
    if (opt.path.indexOf('\u0000') !== -1) throw new TypeError('option path is invalid');
    str += `; Path=${opt.path}`;
  }

  if (opt.expires) {
    if (typeof opt.expires.toUTCString !== 'function') throw new TypeError('option expires is invalid');
    str += `; Expires=${opt.expires.toUTCString()}`;
  }

  if (opt.httpOnly) str += '; HttpOnly';
  if (opt.secure) str += '; Secure';

  if (opt.sameSite) {
    const ss = typeof opt.sameSite === 'string' ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (ss) {
      case true:
      case 'strict':
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'none':
        str += '; SameSite=None';
        break;
      default:
        throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}

function parse(str, options) {
  const opt = options || {};
  const obj = {};
  const pairs = str ? str.split(/; */) : [];
  const dec = opt.decode || decodeURIComponent;

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx < 0) continue;
    const key = pair.substr(0, eqIdx).trim();
    let val = pair.substr(eqIdx + 1).trim();

    if ('"' === val[0]) {
      val = val.slice(1, -1);
    }

    if (obj[key] === undefined) {
      try {
        obj[key] = dec(val);
      } catch (e) {
        obj[key] = val;
      }
    }
  }

  return obj;
}

module.exports = { serialize, parse };
