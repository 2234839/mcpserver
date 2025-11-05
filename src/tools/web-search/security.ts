import { logger } from '../../utils/logger.js';

// List of forbidden IP ranges (private networks and metadata services)
const FORBIDDEN_IP_RANGES = [
  '127.0.0.0/8',      // Loopback
  '10.0.0.0/8',       // Private network
  '172.16.0.0/12',    // Private network
  '192.168.0.0/16',   // Private network
  '169.254.0.0/16',   // Link-local
  '0.0.0.0/8',        // Current network
  '100.64.0.0/10',    // Shared address space
  '192.0.0.0/24',     // IETF Protocol Assignments
  '192.0.2.0/24',     // TEST-NET-1
  '198.51.100.0/24',  // TEST-NET-2
  '203.0.113.0/24',   // TEST-NET-3
  '224.0.0.0/4',      // Multicast
  '240.0.0.0/4',      // Reserved
  '255.255.255.255/32' // Broadcast
];

// List of forbidden hostnames
const FORBIDDEN_HOSTNAMES = [
  'metadata.google.internal',
  '169.254.169.254',  // AWS metadata
  '169.254.169.123',  // AWS metadata
  'metadata',         // Generic metadata
  'metadata.internal' // Generic metadata
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ['https:'];

// Maximum redirect count
const MAX_REDIRECTS = 5;

// Maximum response body size (5 MB)
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

// Allowed content types
const ALLOWED_CONTENT_TYPES = [
  'text/html',
  'application/json',
  'text/plain'
];

/**
 * Check if a URL is valid and safe
 * @param urlString URL string to validate
 * @returns true if URL is valid and safe, false otherwise
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      logger.warn('Invalid protocol in URL', { protocol: url.protocol, url: urlString });
      return false;
    }

    // Check hostname
    if (FORBIDDEN_HOSTNAMES.includes(url.hostname)) {
      logger.warn('Forbidden hostname in URL', { hostname: url.hostname, url: urlString });
      return false;
    }

    // Check IP address
    if (isForbiddenIP(url.hostname)) {
      logger.warn('Forbidden IP address in URL', { ip: url.hostname, url: urlString });
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('Invalid URL format', { url: urlString, error });
    return false;
  }
}

/**
 * Sanitize a URL by removing potentially dangerous components
 * @param urlString URL string to sanitize
 * @returns Sanitized URL string
 */
export function sanitizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);

    // Remove username and password
    url.username = '';
    url.password = '';

    // Remove fragment
    url.hash = '';

    return url.toString();
  } catch (error) {
    logger.warn('Error sanitizing URL', { url: urlString, error });
    return urlString;
  }
}

/**
 * Check if an IP address is in a forbidden range
 * @param ip IP address string
 * @returns true if IP is forbidden, false otherwise
 */
function isForbiddenIP(ip: string): boolean {
  // Try to parse as IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);

  if (match) {
    const octets = match.slice(1).map(Number);

    // Validate octets
    if (octets.some(octet => octet < 0 || octet > 255)) {
      return true;
    }

    // Convert to 32-bit integer
    const ipInt = (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3];

    // Check against forbidden ranges
    for (const range of FORBIDDEN_IP_RANGES) {
      if (isIPInRange(ipInt, range)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if an IP address is in a CIDR range
 * @param ipInt IP address as 32-bit integer
 * @param range CIDR range string (e.g., "192.168.0.0/16")
 * @returns true if IP is in range, false otherwise
 */
function isIPInRange(ipInt: number, range: string): boolean {
  const [rangeIP, prefixLengthStr] = range.split('/');
  const prefixLength = parseInt(prefixLengthStr, 10);

  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  // Parse range IP
  const rangeIPMatch = rangeIP.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!rangeIPMatch) {
    return false;
  }

  const rangeOctets = rangeIPMatch.slice(1).map(Number);
  const rangeIPInt = (rangeOctets[0] << 24) + (rangeOctets[1] << 16) + (rangeOctets[2] << 8) + rangeOctets[3];

  // Create subnet mask
  const mask = ~((1 << (32 - prefixLength)) - 1);

  // Check if IP is in subnet
  return (ipInt & mask) === (rangeIPInt & mask);
}

/**
 * Sanitize HTML content to remove potentially dangerous elements
 * @param html HTML content to sanitize
 * @returns Sanitized HTML content
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handler attributes
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: URLs except for images
  sanitized = sanitized.replace(/src\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'src=""');

  return sanitized;
}

/**
 * Validate response size
 * @param size Response size in bytes
 * @returns true if size is acceptable, false otherwise
 */
export function isResponseSizeAcceptable(size: number): boolean {
  return size <= MAX_RESPONSE_SIZE;
}

/**
 * Validate content type
 * @param contentType Content type string
 * @returns true if content type is acceptable, false otherwise
 */
export function isContentTypeAllowed(contentType: string): boolean {
  if (!contentType) {
    return true; // Allow if no content type specified
  }

  // Extract MIME type from Content-Type header (ignore charset)
  const mimeType = contentType.split(';')[0].trim().toLowerCase();

  return ALLOWED_CONTENT_TYPES.includes(mimeType);
}

/**
 * Get security configuration
 * @returns Object with security configuration
 */
export function getSecurityConfig() {
  return {
    allowedProtocols: [...ALLOWED_PROTOCOLS],
    forbiddenIPRanges: [...FORBIDDEN_IP_RANGES],
    forbiddenHostnames: [...FORBIDDEN_HOSTNAMES],
    maxRedirects: MAX_REDIRECTS,
    maxResponseSize: MAX_RESPONSE_SIZE,
    allowedContentTypes: [...ALLOWED_CONTENT_TYPES]
  };
}