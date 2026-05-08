'use strict';

function normalizeFile(file) {
  return file.replace(/^\.\//, '').replace(/\\/g, '/');
}

function stripExt(file) {
  return file.replace(/\.(tsx?|jsx?)$/, '');
}

function isRouteFile(file) {
  const base = file.split('/').pop() || '';
  if (base.startsWith('+')) return false;
  if (base.startsWith('_')) return false;
  return /\.(tsx?|jsx?)$/.test(base);
}

function isApiFile(file) {
  return /\+api\.(tsx?|jsx?)$/.test(file);
}

function cleanSegments(parts) {
  return parts.filter(Boolean).filter((seg) => !/^\(.+\)$/.test(seg));
}

function toPage(segments) {
  const out = [...segments];
  if (out[out.length - 1] === 'index') out.pop();
  if (out.length === 0) return '/index';
  return '/' + out.join('/');
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function routeRegexFromSegments(segments) {
  const out = [...segments];
  if (out[out.length - 1] === 'index') out.pop();

  if (out.length === 0) {
    return '^\\/(?:index)?\\/?$';
  }

  const chunks = out.map((seg) => {
    const match = seg.match(/^\[(?:\.\.\.)?(.+)\]$/);
    if (!match) {
      return '/' + escapeRegex(seg);
    }

    const isCatchAll = seg.startsWith('[...');
    const key = match[1];
    return isCatchAll ? '/(?<' + key + '>.+?)' : '/(?<' + key + '>[^/]+?)';
  });

  return '^' + chunks.join('') + '\\/?$';
}

function routeKeysFromSegments(segments) {
  const keys = {};
  for (const seg of segments) {
    const match = seg.match(/^\[(?:\.\.\.)?(.+)\]$/);
    if (match) {
      keys[match[1]] = match[1];
    }
  }
  return keys;
}

function toRoute(file, pageSegments) {
  return {
    file,
    page: toPage(pageSegments),
    routeKeys: routeKeysFromSegments(pageSegments),
    namedRegex: routeRegexFromSegments(pageSegments),
  };
}

function createRoutesManifest(paths, _options) {
  const normalized = (paths || []).map(normalizeFile);

  const middlewareFile = normalized.find((file) => /(^|\/)\+middleware\.(tsx?|jsx?)$/.test(file));

  const htmlRoutes = normalized
    .filter((file) => !isApiFile(file))
    .filter((file) => isRouteFile(file))
    .map((file) => {
      const withoutExt = stripExt(file);
      const segments = cleanSegments(withoutExt.split('/'));
      return toRoute(file, segments);
    });

  const apiRoutes = normalized
    .filter((file) => isApiFile(file))
    .map((file) => {
      const withoutExt = stripExt(file.replace(/\+api$/, ''));
      const segments = cleanSegments(withoutExt.split('/'));
      return toRoute(file, segments);
    });

  return {
    middleware: middlewareFile ? { file: middlewareFile } : undefined,
    headers: {},
    apiRoutes,
    htmlRoutes,
    notFoundRoutes: [],
    redirects: [],
    rewrites: [],
  };
}

module.exports = { createRoutesManifest };
