/**
 * Configuration for EditingRenderMiddleware.
 *
 * @typedef {Object} EditingRenderMiddlewareConfig
 * @property {function(string, string): string} [resolvePageUrl] - Optional. Override the
 *   default function used to resolve the URL of the page to render. Useful for non-standard
 *   server or Next.js route configurations.
 *   The function receives the server URL (string) and the Sitecore item path (string)
 *   and should return the full page URL (string).
 *   Defaults to: `${serverUrl}${normalizedItemPath}`
 * @property {string} [sitecoreInternalEditingHostUrl] - Optional. Set the URL of the
 *   Sitecore internal editing host (rendering host). Can also be configured via the
 *   SITECORE_INTERNAL_EDITING_HOST_URL environment variable. When not set, the URL is
 *   derived from the incoming request headers (host + protocol).
 */

/**
 * Middleware for handling Sitecore Experience Editor / Pages editing render requests
 * in Next.js (or compatible server) API routes.
 *
 * Supports two key configuration options for non-standard server or route configurations:
 *  - `resolvePageUrl` – override the function used to build the page URL for rendering.
 *  - `sitecoreInternalEditingHostUrl` (or the SITECORE_INTERNAL_EDITING_HOST_URL env
 *    variable) – explicitly set the rendering host URL instead of deriving it from the
 *    request.
 *
 * @example
 * // pages/api/editing/render.js
 * import { EditingRenderMiddleware } from '../../src/editing/editing-render-middleware';
 *
 * export const config = { api: { bodyParser: false } };
 *
 * const middleware = new EditingRenderMiddleware({
 *   // Override for non-standard route configuration:
 *   resolvePageUrl: (serverUrl, itemPath) => `${serverUrl}/myapp${itemPath}`,
 *   // Or set the internal editing host URL explicitly:
 *   sitecoreInternalEditingHostUrl: 'http://rendering-host',
 * });
 *
 * export default middleware.getHandler();
 */
class EditingRenderMiddleware {
  /**
   * @param {EditingRenderMiddlewareConfig} [config]
   */
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Resolves the page URL used for rendering.
   *
   * When a custom `resolvePageUrl` function is supplied in the config it is used
   * directly – this covers non-standard server or Next.js route configurations.
   * Otherwise the default concatenation of `serverUrl` + normalised `itemPath` is used.
   *
   * @param {string} serverUrl - Base URL of the rendering host.
   * @param {string} itemPath - Sitecore item path (e.g. '/home').
   * @returns {string} The fully resolved page URL.
   */
  resolvePageUrl(serverUrl, itemPath) {
    if (typeof this.config.resolvePageUrl === 'function') {
      return this.config.resolvePageUrl(serverUrl, itemPath);
    }
    // Default: ensure itemPath starts with a leading slash.
    const normalizedPath = itemPath.startsWith('/') ? itemPath : `/${itemPath}`;
    return `${serverUrl}${normalizedPath}`;
  }

  /**
   * Returns the base server URL for the rendering host.
   *
   * Priority order:
   *  1. `sitecoreInternalEditingHostUrl` from config.
   *  2. `SITECORE_INTERNAL_EDITING_HOST_URL` environment variable.
   *  3. URL derived from the incoming request's host/protocol headers (fallback).
   *
   * @param {Object} req - The incoming request object.
   * @param {Object} req.headers - Request headers.
   * @returns {string} The server base URL.
   */
  getServerUrl(req) {
    if (this.config.sitecoreInternalEditingHostUrl) {
      return this.config.sitecoreInternalEditingHostUrl;
    }

    if (process.env.SITECORE_INTERNAL_EDITING_HOST_URL) {
      return process.env.SITECORE_INTERNAL_EDITING_HOST_URL;
    }

    // Fall back to deriving the URL from the request headers.
    const protocol =
      req.headers['x-forwarded-proto'] || req.headers['x-forwarded-protocol'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
    return `${protocol}://${host}`;
  }

  /**
   * Returns the Next.js API route handler function.
   *
   * @returns {function(Object, Object): Promise<void>} The API route handler.
   */
  getHandler() {
    return (req, res) => this.handler(req, res);
  }

  /**
   * Handles an editing render request.
   *
   * Expects an `itemPath` query parameter identifying the Sitecore item to render.
   * An optional `serverUrl` query parameter overrides the server URL resolution.
   *
   * @param {Object} req - The incoming request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>}
   */
  async handler(req, res) {
    const { method } = req;

    if (method !== 'GET' && method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }

    const query = req.query || {};
    const { itemPath, serverUrl: queryServerUrl } = query;

    if (!itemPath) {
      return res.status(400).json({ error: 'Missing required query parameter: itemPath' });
    }

    try {
      const serverUrl = queryServerUrl || this.getServerUrl(req);
      const pageUrl = this.resolvePageUrl(serverUrl, itemPath);

      return res.status(200).json({ pageUrl });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = { EditingRenderMiddleware };
