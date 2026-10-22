import * as THREE from "three";
import { DETAIL_REPEAT } from "@/lib/painting/detail";
import { RIBS } from "@/lib/pumpkinGeometry";

export interface SketchInkOptions {
  /** The pumpkin body: enables the groove lines and the paint-edge ink, which assume the pumpkin's UV layout and paint layers. */
  body?: boolean;
  /** Paint height layer (0 on bare skin). Its edges become pooled pigment and ink around each stroke. */
  height?: THREE.Texture;
  /** Pen weight in pixels for the outline and groove lines. */
  pen?: number;
  /** The geometry carries an `aHull` flag (see `withInkHull`): hull vertices are inflated into an ink outline. Used for the stem. */
  hull?: boolean;
  /** Extra pen strokes drawn on the shape, in its own object space: the stem's rim and ridges. Needs `hull`. */
  marks?: "stem";
  /** Hull thickness as a fraction of the distance to the camera, so it stays about the same width on screen. */
  hullWidth?: number;
}

/**
 * Turns a MeshStandardMaterial into a pen-and-watercolor look by replacing its final lit color:
 *  - a flat wash with one hard-edged cool shadow shape, instead of smooth shading;
 *  - bold, even pen lines: the silhouette (an ink hull), the grooves between lobes, and around each painted stroke;
 *  - faint pigment speckle and paper tooth.
 * Groove and stroke lines take their width from screen-space derivatives; the silhouette is an inflated ink hull. Only the first directional light is used.
 */
export function addSketchInk(material: THREE.MeshStandardMaterial, detail: THREE.Texture, opts: SketchInkOptions = {}): void {
  const o = { body: false, pen: 4.4, hull: false, hullWidth: 0.001, ...opts };
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey.bind(material);

  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uDetail = { value: detail };
    shader.uniforms.uDetailRepeat = { value: new THREE.Vector2(...DETAIL_REPEAT) };
    shader.uniforms.uHeight = { value: o.height ?? null };
    shader.uniforms.uPen = { value: o.pen };
    shader.uniforms.uIsBody = { value: o.body ? 1 : 0 };
    shader.uniforms.uHullWidth = { value: o.hullWidth };
    shader.uniforms.uKind = { value: o.marks === "stem" ? 1 : 0 };

    if (o.hull) {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aHull;\nvarying float vHull;\nvarying vec3 vObj;\nuniform float uHullWidth;")
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `#include <begin_vertex>
          vHull = aHull;
          vObj = position;
          if ( aHull > 0.5 ) {
            // A gentle change of pressure along the line (about 0.65 to 1.05), not a wobble.
            float press = 0.85 + 0.12 * sin( position.x * 21.0 + position.y * 13.0 ) * sin( position.z * 17.0 - position.x * 9.0 ) + 0.08 * sin( position.y * 41.0 );
            // The offset is in object space, so divide out the model's scale: a scaled pumpkin keeps the same line weight on screen.
            transformed += normalize( objectNormal ) * ( -( modelViewMatrix * vec4( transformed, 1.0 ) ).z ) * uHullWidth * press / length( modelMatrix[ 0 ].xyz );
          }`,
        );
    }

    const decls = /* glsl */ `
      uniform sampler2D uDetail;
      uniform vec2 uDetailRepeat;
      uniform sampler2D uHeight;
      uniform float uPen;
      uniform float uIsBody;
      uniform float uKind;
      float skHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
      // A pen line along d = 0 whose width is px pixels, whatever the zoom.
      float skLine( float d, float px ) { float w = max( fwidth( d ), 1e-5 ) * px; return 1.0 - smoothstep( w * 0.45, w * 0.9, abs( d ) ); }
      // Repeating strokes where fract( c ) is 0.5.
      float skStrokes( float c, float px ) { float aa = max( fwidth( c ), 1e-5 ); return ( 1.0 - smoothstep( aa * px * 0.45, aa * px * 0.9, abs( fract( c ) - 0.5 ) ) ) * ( 1.0 - smoothstep( 0.3, 0.6, aa ) ); }
      float skNoise( vec2 p ) {
        vec2 i = floor( p ), f = fract( p );
        f = f * f * ( 3.0 - 2.0 * f );
        return mix( mix( skHash( i ), skHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( skHash( i + vec2( 0.0, 1.0 ) ), skHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
      }
    `;

    if (o.hull) {
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vHull;\nvarying vec3 vObj;")
        .replace("void main() {", "void main() {\n if ( vHull > 0.5 ) { gl_FragColor = vec4( 0.026, 0.014, 0.012, 1.0 ); return; }");
    }
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\n" + decls).replace(
      "#include <opaque_fragment>",
      /* glsl */ `
      {
        vec3 skN = normalize( normal );
        vec3 skV = normalize( vViewPosition );
        #ifdef USE_MAP
          vec2 skUv = vMapUv;
        #else
          vec2 skUv = gl_FragCoord.xy / vec2( 700.0 );
        #endif
        vec2 skGrainUv = uIsBody > 0.5 ? skUv * uDetailRepeat : gl_FragCoord.xy / 160.0;
        float grain = texture2D( uDetail, skGrainUv ).x;
        float blotch = texture2D( uDetail, skUv * vec2( 2.0, 1.0 ) ).y - 0.5;
        float tooth = texture2D( uDetail, gl_FragCoord.xy / 300.0 ).x;
        vec3 ink = vec3( 0.026, 0.014, 0.012 );

        // Harsh, cel-style light: a hard highlight patch, a big shadow shape, a darker core shadow, and hatching in both, so the form reads.
        float skL = 1.0;
        #if NUM_DIR_LIGHTS > 0
          skL = dot( skN, directionalLights[ 0 ].direction ) * 0.5 + 0.5;
        #endif
        float lit = skL + blotch * 0.1;
        float shade = 1.0 - smoothstep( 0.58, 0.59, lit );
        float core = 1.0 - smoothstep( 0.36, 0.37, lit );
        float spec = smoothstep( 0.92, 0.93, lit );
        float occl = 0.0; // the grooves between lobes stay dark even in the light
        if ( uIsBody > 0.5 ) {
          float lb = abs( sin( ${RIBS.toFixed(1)} * 3.14159265 * skUv.x ) );
          occl = smoothstep( 0.3, 0.8, pow( 1.0 - lb, 4.0 ) ) * smoothstep( 0.05, 0.2, sin( 3.14159265 * skUv.y ) );
        }
        vec3 col = mix( diffuseColor.rgb, vec3( 0.98, 0.95, 0.88 ), 0.1 );
        col = mix( col, mix( col, vec3( 1.0, 0.97, 0.86 ), 0.5 ), spec );
        col = mix( col, col * vec3( 0.64, 0.58, 0.86 ), shade );
        col = mix( col, col * vec3( 0.66, 0.62, 0.86 ), core );
        col = mix( col, col * vec3( 0.7, 0.66, 0.88 ), occl * ( 1.0 - shade ) );
        col *= 1.0 + ( grain - 0.5 ) * 0.1; // faint pigment speckle

        // Pencil hatching: slanted strokes across the shadow, crossed in the core and in the grooves. The body's follow its surface.
        float hc1, hc2;
        if ( uIsBody > 0.5 ) {
          hc1 = skUv.x * 150.0 + skUv.y * 34.0 + blotch * 4.0;
          hc2 = skUv.x * 150.0 - skUv.y * 34.0 + blotch * 4.0;
        } else {
          hc1 = ( gl_FragCoord.x + gl_FragCoord.y ) / 5.0;
          hc2 = ( gl_FragCoord.x - gl_FragCoord.y ) / 5.0;
        }
        float strokeBreak = smoothstep( 0.2, 0.55, skNoise( skUv * vec2( 16.0, 24.0 ) + 3.0 ) );
        float hatch = skStrokes( hc1, 1.4 ) * max( shade, occl ) * 0.7 * strokeBreak;
        hatch = max( hatch, skStrokes( hc2, 1.4 ) * max( core, occl * 0.8 ) * 0.75 * strokeBreak );
        col = mix( col, ink, hatch );

        // Pen: a bold, even line with a little pressure variation.
        vec2 fc = gl_FragCoord.xy;
        float weight = uPen * ( 0.9 + 0.3 * skNoise( fc * 0.02 ) );

        float penLine = 0.0; // the silhouette comes from the ink hull

        if ( uIsBody > 0.5 ) {
          // Grooves between lobes: |sin| is 0 in each groove, so its derivative sets the line width.
          float lobe = abs( sin( ${RIBS.toFixed(1)} * 3.14159265 * skUv.x ) );
          float lw = max( fwidth( lobe ), 1e-4 );
          float poleFade = smoothstep( 0.05, 0.16, sin( 3.14159265 * skUv.y ) );
          float groove = ( 1.0 - smoothstep( lw * weight * 0.4, lw * weight * 0.85, lobe ) ) * poleFade;
          penLine = max( penLine, groove );

          // Paint edges: the height layer jumps where a stroke starts, so its slope marks the edge.
          vec2 hp = vec2( 1.6 / 2048.0, 1.6 / 1024.0 ); // a fixed distance in UV, so a half-size touch texture draws the same line
          float hx = texture2D( uHeight, skUv + vec2( hp.x, 0.0 ) ).x - texture2D( uHeight, skUv - vec2( hp.x, 0.0 ) ).x;
          float hy = texture2D( uHeight, skUv + vec2( 0.0, hp.y ) ).x - texture2D( uHeight, skUv - vec2( 0.0, hp.y ) ).x;
          float edge = clamp( length( vec2( hx, hy ) ) * 4.0, 0.0, 1.0 );
          penLine = max( penLine, smoothstep( 0.5, 0.9, edge ) );
        }


        if ( uKind > 0.5 && vHull < 0.5 ) {
          float breakUp = smoothstep( 0.15, 0.45, skNoise( vObj.xy * 38.0 + vObj.z * 21.0 ) );
          float marks = 0.0;
          // Stem: a line round the rim of the cap and ridge strokes down the side, following the five ridges.
          float t = vObj.y / 0.46;
          float ang = atan( vObj.z - 0.03 * t, vObj.x - 0.16 * t * t );
          marks = skLine( vObj.y - 0.395, weight * 0.8 );
          marks = max( marks, skStrokes( ang * 5.0 / 6.2831853, weight * 0.45 ) * smoothstep( 0.07, 0.14, vObj.y ) * ( 1.0 - smoothstep( 0.34, 0.385, vObj.y ) ) * breakUp );
          penLine = max( penLine, marks );
        }

        col = mix( col, ink, penLine );
        col *= 1.0 - 0.04 * tooth; // paper tooth, over everything
        outgoingLight = col;
      }
      #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => `${prevKey()}|sketch-ink-${JSON.stringify({ body: o.body, pen: o.pen, hull: o.hull, marks: o.marks })}`;
}
