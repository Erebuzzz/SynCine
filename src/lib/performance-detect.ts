/**
 * Hardware Acceleration & Software Rendering Detection
 *
 * When hardware acceleration is turned off in Chrome/Brave/Edge,
 * WebGL falls back to SwiftShader (CPU software rasterization).
 * In software rendering mode, heavy CSS backdrop-filter blurs and SVG turbulence
 * filters consume 100% CPU and cause severe browser lag.
 */

export function isSoftwareRenderingDetected(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    if (typeof canvas.getContext !== 'function') return false;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    } catch {
      return false;
    }
    if (!gl) return false;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (typeof renderer === 'string' && /swiftshader|llvmpipe|software|mesa|basic render/i.test(renderer)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Applies low-power / software-rendering CSS class to documentElement
 * to disable CPU-intensive blurs and filters.
 */
export function applyPerformanceMode(forceEnable?: boolean): boolean {
  if (typeof document === 'undefined') return false;
  const isSoftware = forceEnable !== undefined ? forceEnable : isSoftwareRenderingDetected();
  const root = document.documentElement;

  if (isSoftware) {
    root.classList.add('software-rendering');
  } else {
    root.classList.remove('software-rendering');
  }
  return isSoftware;
}
