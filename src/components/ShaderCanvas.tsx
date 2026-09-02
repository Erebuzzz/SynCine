import React, { useEffect, useRef } from 'react';

/**
 * 60fps WebGL/Canvas Procedural Fluid Shader Gradient.
 * Inspired by shadergradient and liquid-glass-js.
 * Optimized for cross-browser performance (Safari, Chrome, Firefox, Mobile, Tablet, Desktop).
 */
export const ShaderCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      powerPreference: 'high-performance',
      alpha: true,
      antialias: true
    });

    if (!gl) {
      // Fallback: 2D Canvas gradient if WebGL is disabled
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let animId: number;
      let t = 0;

      const render2DFallback = () => {
        t += 0.005;
        const w = (canvas.width = window.innerWidth);
        const h = (canvas.height = window.innerHeight);

        const g1 = ctx.createRadialGradient(
          w * (0.3 + 0.15 * Math.sin(t)),
          h * (0.3 + 0.15 * Math.cos(t * 0.8)),
          50,
          w * 0.3,
          h * 0.3,
          w * 0.7
        );
        g1.addColorStop(0, 'rgba(79, 70, 229, 0.28)');
        g1.addColorStop(1, 'rgba(3, 6, 17, 0)');

        const g2 = ctx.createRadialGradient(
          w * (0.7 + 0.12 * Math.cos(t * 0.7)),
          h * (0.6 + 0.15 * Math.sin(t * 0.9)),
          40,
          w * 0.7,
          h * 0.6,
          w * 0.65
        );
        g2.addColorStop(0, 'rgba(236, 72, 153, 0.22)');
        g2.addColorStop(1, 'rgba(3, 6, 17, 0)');

        ctx.fillStyle = '#030611';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, w, h);

        animId = requestAnimationFrame(render2DFallback);
      };

      render2DFallback();
      return () => cancelAnimationFrame(animId);
    }

    // WebGL Fluid Shader Implementation
    const vertexShaderSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;

      // Simplex-inspired organic noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 st = gl_FragCoord.xy / uResolution.xy;
        float aspect = uResolution.x / uResolution.y;
        st.x *= aspect;

        float t = uTime * 0.15;
        float n1 = snoise(vec2(st.x * 0.75 + t * 0.2, st.y * 0.75 - t * 0.15));
        float n2 = snoise(vec2(st.x * 1.2 - t * 0.1, st.y * 1.2 + t * 0.25));

        // Deep luxury palette: Cosmic Obsidian, Indigo Velvet, Ethereal Cyan & Rose
        vec3 bg = vec3(0.012, 0.023, 0.066); // #030611
        vec3 colorIndigo = vec3(0.388, 0.4, 0.945); // #6366F1
        vec3 colorRose = vec3(0.925, 0.282, 0.6); // #EC4899
        vec3 colorCyan = vec3(0.023, 0.713, 0.831); // #06B6D4

        float f1 = smoothstep(-0.2, 0.8, n1);
        float f2 = smoothstep(-0.4, 0.6, n2);

        vec3 finalColor = mix(bg, colorIndigo * 0.35, f1);
        finalColor = mix(finalColor, colorRose * 0.25, f2 * 0.7);
        finalColor += colorCyan * (0.08 * max(0.0, n1 * n2));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uResLoc = gl.getUniformLocation(program, 'uResolution');

    let animationFrameId: number;
    let startTime = performance.now();

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResLoc, canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      gl.uniform1f(uTimeLoc, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-1000"
      style={{ opacity: 0.95 }}
    />
  );
};
