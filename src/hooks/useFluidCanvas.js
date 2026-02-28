import { useEffect } from 'react';

export default function useFluidCanvas(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    if (!gl) return;

    let halfFloat, supportLinearFiltering;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }
    gl.clearColor(0, 0, 0, 1);
    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES);

    function getSupportedFormat(internalFormat, format, type) {
      if (!supportRenderTextureFormat(internalFormat, format, type)) {
        if (internalFormat === gl.R16F) return getSupportedFormat(gl.RG16F, gl.RG, type);
        if (internalFormat === gl.RG16F) return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
        return null;
      }
      return { internalFormat, format };
    }

    function supportRenderTextureFormat(internalFormat, format, type) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }

    let formatRGBA, formatRG, formatR;
    if (isWebGL2) {
      formatRGBA = getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType);
      formatRG   = getSupportedFormat(gl.RG16F,   gl.RG,   halfFloatTexType);
      formatR    = getSupportedFormat(gl.R16F,    gl.RED,  halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
      formatRG   = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
      formatR    = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    function compileShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    function createProgram(vs, fs) {
      const p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      return p;
    }

    function getUniforms(prog) {
      const u = {};
      const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(prog, i).name;
        u[name] = gl.getUniformLocation(prog, name);
      }
      return u;
    }

    const baseVS = compileShader(gl.VERTEX_SHADER, `precision highp float;
      attribute vec2 aPosition; varying vec2 vUv,vL,vR,vT,vB; uniform vec2 texelSize;
      void main(){vUv=aPosition*.5+.5;vL=vUv-vec2(texelSize.x,0);vR=vUv+vec2(texelSize.x,0);vT=vUv+vec2(0,texelSize.y);vB=vUv-vec2(0,texelSize.y);gl_Position=vec4(aPosition,0,1);}`);

    const copyFS   = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;uniform sampler2D uTexture;void main(){gl_FragColor=texture2D(uTexture,vUv);}`);
    const clearFS  = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=value*texture2D(uTexture,vUv);}`);
    const splatFS  = compileShader(gl.FRAGMENT_SHADER, `precision highp float;precision highp sampler2D;varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;uniform vec3 color;uniform vec2 point;uniform float radius;void main(){vec2 p=vUv-point;p.x*=aspectRatio;vec3 splat=exp(-dot(p,p)/radius)*color;gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+splat,1);}`);
    const advFS    = compileShader(gl.FRAGMENT_SHADER, `precision highp float;precision highp sampler2D;varying vec2 vUv;uniform sampler2D uVelocity,uSource;uniform vec2 texelSize,dyeTexelSize;uniform float dt,dissipation;
      vec4 bilerp(sampler2D s,vec2 uv,vec2 ts){vec2 st=uv/ts-.5;vec2 i=floor(st);vec2 f=fract(st);vec4 a=texture2D(s,(i+vec2(.5,.5))*ts);vec4 b=texture2D(s,(i+vec2(1.5,.5))*ts);vec4 c=texture2D(s,(i+vec2(.5,1.5))*ts);vec4 d=texture2D(s,(i+vec2(1.5,1.5))*ts);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
      void main(){vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;gl_FragColor=texture2D(uSource,coord)/(1.+dissipation*dt);}`);
    const divFS    = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x,T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;vec2 C=texture2D(uVelocity,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0,0,1);}`);
    const curlFS   = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).y,R=texture2D(uVelocity,vR).y,T=texture2D(uVelocity,vT).x,B=texture2D(uVelocity,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0,0,1);}`);
    const vortFS   = compileShader(gl.FRAGMENT_SHADER, `precision highp float;precision highp sampler2D;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity,uCurl;uniform float curl,dt;void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=curl*C;f.y*=-1.;vec2 v=texture2D(uVelocity,vUv).xy+f*dt;gl_FragColor=vec4(clamp(v,-1000.,1000.),0,1);}`);
    const pressFS  = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uDivergence;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;float div=texture2D(uDivergence,vUv).x;gl_FragColor=vec4((L+R+B+T-div)*.25,0,0,1);}`);
    const gradFS   = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uVelocity;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;vec2 v=texture2D(uVelocity,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0,1);}`);
    const displayFS= compileShader(gl.FRAGMENT_SHADER, `precision highp float;precision highp sampler2D;varying vec2 vUv;uniform sampler2D uTexture;void main(){vec3 c=texture2D(uTexture,vUv).rgb;float a=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c,a);}`);

    function makeProgram(fs) {
      const p = createProgram(baseVS, fs);
      return { program: p, uniforms: getUniforms(p), bind() { gl.useProgram(p); } };
    }

    const copyP  = makeProgram(copyFS);
    const clearP = makeProgram(clearFS);
    const splatP = makeProgram(splatFS);
    const advP   = makeProgram(advFS);
    const divP   = makeProgram(divFS);
    const curlP  = makeProgram(curlFS);
    const vortP  = makeProgram(vortFS);
    const pressP = makeProgram(pressFS);
    const gradP  = makeProgram(gradFS);
    const dispP  = makeProgram(displayFS);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    function blit(target, clear) {
      if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) { gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function createFBO(w, h, inFmt, fmt, type, param) {
      gl.activeTexture(gl.TEXTURE0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, inFmt, w, h, 0, fmt, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        texture: tex, fbo, width: w, height: h,
        texelSizeX: 1/w, texelSizeY: 1/h,
        attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; }
      };
    }

    function createDoubleFBO(w, h, inFmt, fmt, type, param) {
      let f1 = createFBO(w, h, inFmt, fmt, type, param);
      let f2 = createFBO(w, h, inFmt, fmt, type, param);
      return {
        width: w, height: h, texelSizeX: f1.texelSizeX, texelSizeY: f1.texelSizeY,
        get read() { return f1; }, set read(v) { f1 = v; },
        get write() { return f2; }, set write(v) { f2 = v; },
        swap() { let t = f1; f1 = f2; f2 = t; }
      };
    }

    function getRes(res) {
      let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (ar < 1) ar = 1 / ar;
      const mn = Math.round(res), mx = Math.round(res * ar);
      return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: mx, height: mn } : { width: mn, height: mx };
    }

    const SIM_RES = 128, DYE_RES = 1440;
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    const simR = getRes(SIM_RES), dyeR = getRes(DYE_RES);
    let dye      = createDoubleFBO(dyeR.width, dyeR.height, formatRGBA.internalFormat, formatRGBA.format, halfFloatTexType, filtering);
    let velocity = createDoubleFBO(simR.width, simR.height, formatRG.internalFormat, formatRG.format, halfFloatTexType, filtering);
    const divergence = createFBO(simR.width, simR.height, formatR.internalFormat, formatR.format, halfFloatTexType, gl.NEAREST);
    const curlFBO  = createFBO(simR.width, simR.height, formatR.internalFormat, formatR.format, halfFloatTexType, gl.NEAREST);
    let pressure = createDoubleFBO(simR.width, simR.height, formatR.internalFormat, formatR.format, halfFloatTexType, gl.NEAREST);

    function HSVtoRGB(h, s, v) {
      let r, g, b;
      const i = Math.floor(h * 6), f = h * 6 - i, p = v*(1-s), q = v*(1-f*s), t = v*(1-(1-f)*s);
      switch (i % 6) {
        case 0: r=v;g=t;b=p;break; case 1: r=q;g=v;b=p;break; case 2: r=p;g=v;b=t;break;
        case 3: r=p;g=q;b=v;break; case 4: r=t;g=p;b=v;break; case 5: r=v;g=p;b=q;break;
      }
      return { r, g, b };
    }

    function genColor() {
      const c = HSVtoRGB(Math.random(), 1, 1);
      return { r: c.r * 0.06, g: c.g * 0.06, b: c.b * 0.06 };
    }

    function scaleByDPR(v) { return Math.floor(v * (window.devicePixelRatio || 1)); }
    function correctRadius(r) { const ar = canvas.width / canvas.height; if (ar > 1) r *= ar; return r; }
    function correctDX(d) { const ar = canvas.width / canvas.height; if (ar < 1) d *= ar; return d; }
    function correctDY(d) { const ar = canvas.width / canvas.height; if (ar > 1) d /= ar; return d; }

    function splat(x, y, dx, dy, color) {
      splatP.bind();
      gl.uniform1i(splatP.uniforms.uTarget, velocity.read.attach(0));
      gl.uniform1f(splatP.uniforms.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(splatP.uniforms.point, x, y);
      gl.uniform3f(splatP.uniforms.color, dx, dy, 0);
      gl.uniform1f(splatP.uniforms.radius, correctRadius(0.12 / 100));
      blit(velocity.write); velocity.swap();
      gl.uniform1i(splatP.uniforms.uTarget, dye.read.attach(0));
      gl.uniform3f(splatP.uniforms.color, color.r, color.g, color.b);
      blit(dye.write); dye.swap();
    }

    const ptr = { texcoordX: 0, texcoordY: 0, prevTexcoordX: 0, prevTexcoordY: 0, deltaX: 0, deltaY: 0, moved: false, color: genColor() };

    function onMouseMove(e) {
      const posX = scaleByDPR(e.clientX), posY = scaleByDPR(e.clientY);
      ptr.prevTexcoordX = ptr.texcoordX; ptr.prevTexcoordY = ptr.texcoordY;
      ptr.texcoordX = posX / canvas.width; ptr.texcoordY = 1 - (posY / canvas.height);
      ptr.deltaX = correctDX(ptr.texcoordX - ptr.prevTexcoordX);
      ptr.deltaY = correctDY(ptr.texcoordY - ptr.prevTexcoordY);
      ptr.moved = Math.abs(ptr.deltaX) > 0 || Math.abs(ptr.deltaY) > 0;
    }

    function onMouseDown(e) {
      const c = genColor(); c.r *= 6; c.g *= 6; c.b *= 6;
      const posX = scaleByDPR(e.clientX), posY = scaleByDPR(e.clientY);
      ptr.texcoordX = posX / canvas.width; ptr.texcoordY = 1 - (posY / canvas.height);
      splat(ptr.texcoordX, ptr.texcoordY, 10*(Math.random()-.5), 30*(Math.random()-.5), c);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);

    let lastTime = Date.now();
    let animId;

    function fluidStep(dt) {
      gl.disable(gl.BLEND);

      curlP.bind();
      gl.uniform2f(curlP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(curlP.uniforms.uVelocity, velocity.read.attach(0));
      blit(curlFBO);

      vortP.bind();
      gl.uniform2f(vortP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(vortP.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(vortP.uniforms.uCurl, curlFBO.attach(1));
      gl.uniform1f(vortP.uniforms.curl, 3);
      gl.uniform1f(vortP.uniforms.dt, dt);
      blit(velocity.write); velocity.swap();

      divP.bind();
      gl.uniform2f(divP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(divP.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      clearP.bind();
      gl.uniform1i(clearP.uniforms.uTexture, pressure.read.attach(0));
      gl.uniform1f(clearP.uniforms.value, 0.1);
      blit(pressure.write); pressure.swap();

      pressP.bind();
      gl.uniform2f(pressP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(pressP.uniforms.uDivergence, divergence.attach(0));
      for (let i = 0; i < 20; i++) {
        gl.uniform1i(pressP.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write); pressure.swap();
      }

      gradP.bind();
      gl.uniform2f(gradP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gradP.uniforms.uPressure, pressure.read.attach(0));
      gl.uniform1i(gradP.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write); velocity.swap();

      advP.bind();
      gl.uniform2f(advP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform2f(advP.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      const vid = velocity.read.attach(0);
      gl.uniform1i(advP.uniforms.uVelocity, vid);
      gl.uniform1i(advP.uniforms.uSource, vid);
      gl.uniform1f(advP.uniforms.dt, dt);
      gl.uniform1f(advP.uniforms.dissipation, 2);
      blit(velocity.write); velocity.swap();

      gl.uniform2f(advP.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(advP.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advP.uniforms.uSource, dye.read.attach(1));
      gl.uniform1f(advP.uniforms.dissipation, 5.5);
      blit(dye.write); dye.swap();
    }

    function fluidLoop() {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.016666);
      lastTime = now;

      const w = scaleByDPR(canvas.clientWidth), h = scaleByDPR(canvas.clientHeight);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

      if (ptr.moved) { ptr.moved = false; splat(ptr.texcoordX, ptr.texcoordY, ptr.deltaX * 3500, ptr.deltaY * 3500, ptr.color); }

      fluidStep(dt);

      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      dispP.bind();
      gl.uniform1i(dispP.uniforms.uTexture, dye.read.attach(0));
      blit(null);

      animId = requestAnimationFrame(fluidLoop);
    }

    fluidLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [canvasRef]);
}
