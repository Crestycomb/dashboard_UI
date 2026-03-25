import { EditingRenderMiddleware } from './editing-render-middleware';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal mock request object.
 * @param {object} [overrides]
 * @returns {object}
 */
function makeRequest(overrides = {}) {
  return {
    method: 'GET',
    headers: {
      host: 'localhost:3000',
    },
    query: {},
    ...overrides,
  };
}

/**
 * Build a minimal mock response object with chainable methods.
 * @returns {object}
 */
function makeResponse() {
  const res = {
    _status: null,
    _body: null,
    _headers: {},
  };
  res.status = jest.fn((code) => {
    res._status = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res._body = body;
    return res;
  });
  res.setHeader = jest.fn((key, value) => {
    res._headers[key] = value;
    return res;
  });
  return res;
}

// ---------------------------------------------------------------------------
// resolvePageUrl
// ---------------------------------------------------------------------------

describe('EditingRenderMiddleware – resolvePageUrl', () => {
  it('uses default behaviour when no override is provided', () => {
    const middleware = new EditingRenderMiddleware();
    expect(middleware.resolvePageUrl('http://host', '/home')).toBe('http://host/home');
  });

  it('normalises item paths that do not start with a slash', () => {
    const middleware = new EditingRenderMiddleware();
    expect(middleware.resolvePageUrl('http://host', 'home')).toBe('http://host/home');
  });

  it('preserves leading slash when item path already has one', () => {
    const middleware = new EditingRenderMiddleware();
    expect(middleware.resolvePageUrl('http://host', '/products/item')).toBe(
      'http://host/products/item'
    );
  });

  it('calls the custom resolvePageUrl override when provided', () => {
    const customResolver = jest.fn(
      (serverUrl, itemPath) => `${serverUrl}/custom-prefix${itemPath}`
    );
    const middleware = new EditingRenderMiddleware({ resolvePageUrl: customResolver });

    const result = middleware.resolvePageUrl('http://host', '/home');

    expect(customResolver).toHaveBeenCalledWith('http://host', '/home');
    expect(result).toBe('http://host/custom-prefix/home');
  });

  it('allows the override to return any string', () => {
    const middleware = new EditingRenderMiddleware({
      resolvePageUrl: () => 'https://custom-host/override',
    });
    expect(middleware.resolvePageUrl('http://ignored', '/ignored')).toBe(
      'https://custom-host/override'
    );
  });
});

// ---------------------------------------------------------------------------
// getServerUrl
// ---------------------------------------------------------------------------

describe('EditingRenderMiddleware – getServerUrl', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.SITECORE_INTERNAL_EDITING_HOST_URL;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('prefers sitecoreInternalEditingHostUrl from config', () => {
    const middleware = new EditingRenderMiddleware({
      sitecoreInternalEditingHostUrl: 'http://configured-host',
    });
    const req = makeRequest();
    expect(middleware.getServerUrl(req)).toBe('http://configured-host');
  });

  it('falls back to SITECORE_INTERNAL_EDITING_HOST_URL env variable when config is not set', () => {
    process.env.SITECORE_INTERNAL_EDITING_HOST_URL = 'http://env-host';
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest();
    expect(middleware.getServerUrl(req)).toBe('http://env-host');
  });

  it('sitecoreInternalEditingHostUrl config takes precedence over env variable', () => {
    process.env.SITECORE_INTERNAL_EDITING_HOST_URL = 'http://env-host';
    const middleware = new EditingRenderMiddleware({
      sitecoreInternalEditingHostUrl: 'http://config-host',
    });
    const req = makeRequest();
    expect(middleware.getServerUrl(req)).toBe('http://config-host');
  });

  it('falls back to request host headers when neither config nor env variable is set', () => {
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest({ headers: { host: 'my-server:3000' } });
    expect(middleware.getServerUrl(req)).toBe('https://my-server:3000');
  });

  it('uses x-forwarded-proto and x-forwarded-host when present', () => {
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest({
      headers: {
        host: 'internal-host',
        'x-forwarded-proto': 'http',
        'x-forwarded-host': 'public-host.example.com',
      },
    });
    expect(middleware.getServerUrl(req)).toBe('http://public-host.example.com');
  });
});

// ---------------------------------------------------------------------------
// getHandler / handler – HTTP method validation
// ---------------------------------------------------------------------------

describe('EditingRenderMiddleware – handler HTTP methods', () => {
  it('returns a function from getHandler()', () => {
    const middleware = new EditingRenderMiddleware();
    expect(typeof middleware.getHandler()).toBe('function');
  });

  it('rejects unsupported HTTP methods with 405', async () => {
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest({ method: 'DELETE' });
    const res = makeResponse();

    await middleware.handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res._body).toMatchObject({ error: expect.stringContaining('DELETE') });
    expect(res._headers['Allow']).toBe('GET, POST');
  });

  it('accepts GET requests', async () => {
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest({ method: 'GET', query: { itemPath: '/home' } });
    const res = makeResponse();

    await middleware.handler(req, res);

    expect(res._status).toBe(200);
  });

  it('accepts POST requests', async () => {
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest({ method: 'POST', query: { itemPath: '/home' } });
    const res = makeResponse();

    await middleware.handler(req, res);

    expect(res._status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// getHandler / handler – parameter validation
// ---------------------------------------------------------------------------

describe('EditingRenderMiddleware – handler parameter validation', () => {
  it('returns 400 when itemPath query parameter is missing', async () => {
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest({ query: {} });
    const res = makeResponse();

    await middleware.handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._body).toMatchObject({ error: expect.stringContaining('itemPath') });
  });
});

// ---------------------------------------------------------------------------
// getHandler / handler – page URL resolution
// ---------------------------------------------------------------------------

describe('EditingRenderMiddleware – handler page URL resolution', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.SITECORE_INTERNAL_EDITING_HOST_URL;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('uses the default resolvePageUrl with server URL from request headers', async () => {
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest({
      headers: { host: 'localhost:3000' },
      query: { itemPath: '/home' },
    });
    const res = makeResponse();

    await middleware.handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.pageUrl).toBe('https://localhost:3000/home');
  });

  it('uses sitecoreInternalEditingHostUrl config for the server URL', async () => {
    const middleware = new EditingRenderMiddleware({
      sitecoreInternalEditingHostUrl: 'http://internal-host',
    });
    const req = makeRequest({ query: { itemPath: '/about' } });
    const res = makeResponse();

    await middleware.handler(req, res);

    expect(res._body.pageUrl).toBe('http://internal-host/about');
  });

  it('uses SITECORE_INTERNAL_EDITING_HOST_URL env variable for the server URL', async () => {
    process.env.SITECORE_INTERNAL_EDITING_HOST_URL = 'http://env-editing-host';
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest({ query: { itemPath: '/services' } });
    const res = makeResponse();

    await middleware.handler(req, res);

    expect(res._body.pageUrl).toBe('http://env-editing-host/services');
  });

  it('uses the custom resolvePageUrl override for non-standard route configurations', async () => {
    const middleware = new EditingRenderMiddleware({
      sitecoreInternalEditingHostUrl: 'http://render-host',
      resolvePageUrl: (serverUrl, itemPath) => `${serverUrl}/nextjs${itemPath}`,
    });
    const req = makeRequest({ query: { itemPath: '/contact' } });
    const res = makeResponse();

    await middleware.handler(req, res);

    expect(res._body.pageUrl).toBe('http://render-host/nextjs/contact');
  });

  it('allows serverUrl to be overridden via query parameter', async () => {
    const middleware = new EditingRenderMiddleware();
    const req = makeRequest({
      query: { itemPath: '/home', serverUrl: 'http://query-server' },
    });
    const res = makeResponse();

    await middleware.handler(req, res);

    expect(res._body.pageUrl).toBe('http://query-server/home');
  });
});
