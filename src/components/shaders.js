export const oceanVertexShader = `uniform float uTime;
    uniform vec2 uSplashCenter;
    uniform float uSplashTime;
    uniform float uSplashRadius;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vElevation;

    vec3 gerstnerWave(vec2 pos, float steepness, float wavelength, vec2 direction, float speed) {
      float k = 6.28318 / wavelength;
      float c = sqrt(9.8 / k);
      vec2 d = normalize(direction);
      float f = k * (dot(d, pos) - c * speed * uTime);
      float a = steepness / k;
      return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
    }

    float splashWave(vec2 pos) {
      float timeSinceSplash = uTime - uSplashTime;
      if (timeSinceSplash < 0.0 || timeSinceSplash > 5.0) return 0.0;
      float dist = length(pos - uSplashCenter);
      float waveSpeed = 8.0;
      float waveFront = timeSinceSplash * waveSpeed;
      float waveWidth = 3.0;
      float wave = exp(-pow(dist - waveFront, 2.0) / waveWidth);
      float amplitude = 1.5 * exp(-timeSinceSplash * 0.8) * exp(-dist * 0.05);
      return sin(dist * 2.0 - timeSinceSplash * 6.0) * wave * amplitude;
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      vec3 wave1 = gerstnerWave(pos.xz, 0.15, 30.0, vec2(1.0, 0.4), 0.6);
      vec3 wave2 = gerstnerWave(pos.xz, 0.12, 22.0, vec2(-0.6, 0.8), 0.7);
      vec3 wave3 = gerstnerWave(pos.xz, 0.08, 15.0, vec2(0.3, -0.9), 0.9);
      vec3 wave4 = gerstnerWave(pos.xz, 0.05, 9.0, vec2(-0.8, -0.5), 1.1);
      vec3 wave5 = gerstnerWave(pos.xz, 0.03, 5.0, vec2(0.9, 0.2), 1.3);
      vec3 wave6 = gerstnerWave(pos.xz, 0.02, 3.0, vec2(-0.2, 0.9), 1.5);
      vec3 wave7 = gerstnerWave(pos.xz, 0.01, 1.5, vec2(0.7, -0.7), 1.8);
      vec3 totalWave = wave1 + wave2 + wave3 + wave4 + wave5 + wave6 + wave7;
      pos += totalWave;
      float splash = splashWave(pos.xz);
      pos.y += splash;
      vElevation = totalWave.y + splash;
      float eps = 0.1;
      vec3 posR = position + vec3(eps, 0.0, 0.0);
      vec3 posU = position + vec3(0.0, 0.0, eps);
      vec3 wR = gerstnerWave(posR.xz, 0.15, 30.0, vec2(1.0, 0.4), 0.6)
              + gerstnerWave(posR.xz, 0.12, 22.0, vec2(-0.6, 0.8), 0.7)
              + gerstnerWave(posR.xz, 0.08, 15.0, vec2(0.3, -0.9), 0.9)
              + gerstnerWave(posR.xz, 0.05, 9.0, vec2(-0.8, -0.5), 1.1)
              + gerstnerWave(posR.xz, 0.03, 5.0, vec2(0.9, 0.2), 1.3)
              + gerstnerWave(posR.xz, 0.02, 3.0, vec2(-0.2, 0.9), 1.5)
              + gerstnerWave(posR.xz, 0.01, 1.5, vec2(0.7, -0.7), 1.8);
      posR += wR;
      posR.y += splashWave(posR.xz);
      vec3 wU = gerstnerWave(posU.xz, 0.15, 30.0, vec2(1.0, 0.4), 0.6)
              + gerstnerWave(posU.xz, 0.12, 22.0, vec2(-0.6, 0.8), 0.7)
              + gerstnerWave(posU.xz, 0.08, 15.0, vec2(0.3, -0.9), 0.9)
              + gerstnerWave(posU.xz, 0.05, 9.0, vec2(-0.8, -0.5), 1.1)
              + gerstnerWave(posU.xz, 0.03, 5.0, vec2(0.9, 0.2), 1.3)
              + gerstnerWave(posU.xz, 0.02, 3.0, vec2(-0.2, 0.9), 1.5)
              + gerstnerWave(posU.xz, 0.01, 1.5, vec2(0.7, -0.7), 1.8);
      posU += wU;
      posU.y += splashWave(posU.xz);
      vec3 tangent = normalize(posR - pos);
      vec3 bitangent = normalize(posU - pos);
      vNormal = normalize(cross(bitangent, tangent));
      vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }`

export const oceanFragmentShader = `uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uDeepColor;
    uniform vec3 uSurfaceColor;
    uniform vec3 uFoamColor;
    uniform float uOpacity;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform float uSplashTime;
    uniform vec2 uSplashCenter;
    uniform vec3 uSkyTint;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vElevation;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fresnelTerm = dot(vNormal, viewDir);
      fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, 1.0);
      float fresnel = pow(fresnelTerm, 4.0); 
      float elevNorm = smoothstep(-0.8, 0.8, vElevation);
      vec3 baseColor = mix(uDeepColor, uSurfaceColor, elevNorm);
      float glowNoise = fbm(vWorldPos.xz * 0.2 + uTime * 0.15);
      float glowMask = smoothstep(0.3, 0.7, glowNoise) * (1.0 - elevNorm); 
      vec3 glowColor = vec3(0.05, 0.85, 0.65) * glowMask * 0.8;
      baseColor += glowColor;
      vec3 lightDir = normalize(vec3(0.5, 0.8, 0.2));
      vec3 halfDir = normalize(lightDir + viewDir);
      float specAngle = max(dot(vNormal, halfDir), 0.0);
      float spec = pow(specAngle, 256.0);
      vec3 specColor = mix(vec3(0.8, 1.0, 0.9), uSkyTint, 0.3) * spec * 3.0;
      float foamNoise = fbm(vWorldPos.xz * 0.8 + uTime * 0.4);
      float foamMask = smoothstep(0.4, 0.7, vElevation); 
      float foam = foamMask * foamNoise;
      float timeSinceSplash = uTime - uSplashTime;
      if (timeSinceSplash > 0.0 && timeSinceSplash < 5.0) {
        float dist = length(vWorldPos.xz - uSplashCenter);
        float splashFoam = exp(-dist * 0.1) * exp(-timeSinceSplash * 0.5) * 0.8;
        foam += splashFoam * fbm(vWorldPos.xz * 2.0); 
      }
      float sss = pow(max(dot(viewDir, -lightDir), 0.0), 2.0) * elevNorm * 0.6;
      vec3 sssColor = vec3(0.0, 0.7, 0.5) * sss;
      vec3 color = baseColor;
      vec3 skyReflection = mix(uSurfaceColor, uSkyTint, 0.8);
      color = mix(color, skyReflection, fresnel * 0.8);
      color += specColor;
      color = mix(color, uFoamColor, clamp(foam, 0.0, 1.0));
      color += sssColor;
      float causticNoise = fbm(vWorldPos.xz * 3.0 + uTime * 0.6);
      float causticMask = smoothstep(0.4, 0.8, causticNoise) * (1.0 - foamMask);
      color += vec3(0.1, 0.5, 0.4) * causticMask * 0.3;
      float fogDist = length(vWorldPos - cameraPosition);
      float fogFactor = smoothstep(uFogNear, uFogFar, fogDist);
      color = mix(color, uFogColor, fogFactor);
      gl_FragColor = vec4(color, uOpacity);
    }`

export const skyVertexShader = ` varying vec3 vWorldPos;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vWorldPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

export const skyFragmentShader = `uniform float uTime;
    uniform float uOpacity;
    uniform float uPulse;
    uniform float uFlicker;
    uniform float uFlickerPos;
    uniform vec3 uTopColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uBottomColor;
    uniform vec3 uCloudColor;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 dir = normalize(vWorldPos);
      float h = dir.y;
      float pulse = uPulse;
      float topMix = smoothstep(0.0, 0.75, h);
      float bottomMix = smoothstep(0.0, -0.3, h);
      vec3 horizonHot = mix(uHorizonColor, vec3(0.95, 0.12, 0.08), 0.35 + pulse * 0.25);
      vec3 col = mix(horizonHot, uTopColor, topMix);
      col = mix(col, uBottomColor, bottomMix);
      float horizonGlow = exp(-abs(h) * 3.5) * (0.55 + pulse * 0.4);
      col += vec3(0.7, 0.1, 0.06) * horizonGlow;
      vec2 cloudUv = dir.xz / max(abs(dir.y) + 0.12, 0.12) * 1.3;
      vec2 warp = vec2(
        fbm(cloudUv * 0.9 + uTime * 0.05),
        fbm(cloudUv * 0.9 - uTime * 0.04 + 17.3)
      );
      cloudUv += (warp - 0.5) * 1.8;
      float clouds1 = fbm(cloudUv * 0.7 + uTime * 0.035);
      float clouds2 = fbm(cloudUv * 1.5 - uTime * 0.025 + 5.1);
      float clouds3 = fbm(cloudUv * 3.2 + uTime * 0.06 - 9.7);
      float clouds = clouds1 * 0.55 + clouds2 * 0.3 + clouds3 * 0.15;
      float cloudDensity = smoothstep(0.30, 0.85, clouds);
      float cloudMask = smoothstep(0.02, 0.55, h) * cloudDensity;
      col = mix(col, uCloudColor, cloudMask * 0.9);
      float underglow = smoothstep(0.0, 0.5, clouds) * smoothstep(0.5, 0.05, h);
      col += vec3(0.85, 0.12, 0.08) * underglow * 0.55 * (0.7 + pulse * 0.3);
      float cloudEdge = smoothstep(0.50, 0.78, clouds) * smoothstep(0.05, 0.45, h);
      col += vec3(0.95, 0.18, 0.1) * cloudEdge * (0.45 + pulse * 0.35);
      float flickerBand = exp(-pow((dir.x * 0.5 + 0.5) - uFlickerPos, 2.0) * 60.0);
      col += vec3(1.0, 0.35, 0.25) * flickerBand * uFlicker * smoothstep(0.0, 0.4, h) * 0.6;
      float mist = fbm(vec2(dir.x * 3.0 + uTime * 0.08, h * 6.0)) * exp(-abs(h) * 5.0);
      col += vec3(0.45, 0.04, 0.02) * mist * 0.4;
      col *= 1.0 - smoothstep(0.65, 1.0, h) * 0.55;
      gl_FragColor = vec4(col, uOpacity);
    }`