"use client";

import { Classifications } from "@mediapipe/tasks-vision";
import {
  Environment,
  OrbitControls,
  RenderTexture,
  useFBO,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  EffectComposerContext,
} from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Color,
  CubeCamera,
  DoubleSide,
  Euler,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  WebGLCubeRenderTarget,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

export function HeadObject() {
  //

  let [loops, setLoop] = useState<any[]>([]);
  useFrame(() => {
    loops.forEach((r) => r());
  });

  let dataFace = useRef<any>([]);

  useEffect(() => {
    //
    let cancel = () => {};
    let run = async () => {
      const { FaceLandmarker, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );

      const filesetResolver = await FilesetResolver.forVisionTasks(
        `/ai/mediapipe-v0.10.0/mediapipe/task-vision-wasm`
      );

      const faceLandmarker = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath: `/ai/mediapipe-v0.10.0/mediapipe/face-landmark/face_landmarker.task`,
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
        }
      );

      const mediaPipelinePromise = navigator.mediaDevices.getUserMedia({
        video: {
          //
          facingMode: "user",
          frameRate: 30,
          width: 640,
          height: 480,
        },
        audio: false,
      });

      await faceLandmarker.setOptions({
        runningMode: "VIDEO",
      });

      const video = document.createElement("video");
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;

      let canRun = false;
      mediaPipelinePromise.then((stream) => {
        video.srcObject = stream;

        video.onloadeddata = () => {
          //
          if (video.paused) {
            video.play();
          }
          canRun = true;
        };
      });

      let loopTask = () => {
        if (!canRun) {
          return;
        }
        let ts = performance.now();
        let results = faceLandmarker.detectForVideo(video, ts);

        let faceBlendshapes: Classifications[] = results.faceBlendshapes || [];
        let facesMatrixes: {
          /** The number of rows. */
          rows: number;
          /** The number of columns. */
          columns: number;
          /** The values as a flattened one-dimensional array. */
          data: number[];
        }[] = results.facialTransformationMatrixes || [];

        let count = facesMatrixes.length;
        let list = [];

        for (let i = 0; i < count; i++) {
          let fristMatrix = facesMatrixes[i];
          let firstFace = faceBlendshapes[i];

          if (firstFace && fristMatrix) {
            let m4 = new Matrix4();
            let o3d = new Group();
            m4.fromArray(fristMatrix.data);
            m4.decompose(o3d.position, o3d.quaternion, o3d.scale);

            list.push({
              i,
              sortNumber: o3d.position.x,
              morphTargets: firstFace.categories,
              o3d: o3d,
              ts: performance.now(),
            });
          }
        }

        dataFace.current = list;
      };

      setLoop([loopTask]);

      cancel = () => {
        //
        //
      };
    };

    run();
    //

    return () => {
      cancel();
    };
  }, []);

  return (
    <>
      {/*  */}

      <Suspense fallback={null}>
        <Face dataFace={dataFace}></Face>
      </Suspense>

      <OrbitControls object-position={[0, 0, 10]}></OrbitControls>
      <Environment
        // files={[
        //   // `/ai/hdri/satara_night_1k.hdr`,
        //   `/ai/equilrect/M3_Scifi_Concept_Art_equirectangular-jpg_sky_blue_night_with_2012439589_13370123.jpg`,
        // ]}

        files={[`/ai/hdri/photo_studio_loft_hall_1k.hdr`]}
        //
        // preset="apartment"
      ></Environment>

      <EffectComposer>
        <Bloom intensity={1} mipMapBlur></Bloom>
        <BrightnessContrast
          contrast={0.45}
          brightness={-0.35}
        ></BrightnessContrast>
      </EffectComposer>
      {/* <ambientLight intensity={1}></ambientLight> */}

      <color attach={"background"} args={["#000000"]}></color>
    </>
  );
}

function Face({ dataFace }: { dataFace: any }) {
  let glb = useGLTF(`/ai/face/face-003.glb`);

  let { face, face2, face3, depthImage } = useTexture({
    // good
    face: `/ai/facetexture/image2-face.png`,

    // good
    face2: `/ai/facetexture/image2-face.png`,

    // good
    face3: `/ai/facetexture/image2-face.png`,

    depthImage: `/ai/facetexture/dpethimageface.png`,
  });
  depthImage.flipY = false;

  let fbo = useFBO(1440, 1440);

  let fc = new Camera();
  fc.position.z = 1;

  let mesh = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      uniforms: {
        face2: {
          value: face2,
        },
        depthImage: {
          value: depthImage,
        },
        jawOpenProgress: {
          value: 0,
        },
        eyeBlinkLeft: {
          value: 0,
        },
        eyeBlinkRight: {
          value: 0,
        },
        time: { value: 0 },
      },
      vertexShader: `
      varying vec2 vUv;
      void main (void) {
        vUv= uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `,
      fragmentShader: `

      float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}



      uniform sampler2D face2;
      uniform sampler2D depthImage;
      uniform float time;
      uniform float jawOpenProgress;
      uniform float eyeBlinkLeft;
      uniform float eyeBlinkRight;
      varying vec2 vUv;

      void main (void) {

        vec4 faceColor = texture2D(face2, vUv);
        vec4 depthImageColor = texture2D(depthImage, vUv);

        vec4 faceFlashColor = texture2D(face2, vUv + faceColor.xy * jawOpenProgress * 1.0);

        gl_FragColor = vec4(mix(faceColor, faceFlashColor, jawOpenProgress * 1.0));

        // gl_FragColor.rgb += ;

        }
    `,
    })
  );

  useFrame((st, dt) => {
    mesh.material.uniforms.time.value += dt;
    st.gl.setRenderTarget(fbo);
    st.gl.render(mesh, fc);
    st.gl.setRenderTarget(null);
  });

  let rtt = useMemo(() => {
    return new WebGLCubeRenderTarget(1024);
  }, []);

  let cubeCamera = useMemo(() => {
    let cubeCamera = new CubeCamera(0.1, 100, rtt);

    return cubeCamera;
  }, [rtt]);

  //
  let sphere = useMemo(() => {
    let sphere = new Mesh(
      new SphereGeometry(1, 32, 32),
      new ShaderMaterial({
        side: DoubleSide,
        uniforms: {
          rotation: {
            value: new Euler(),
          },
          face2: {
            value: face2,
          },
          depthImage: {
            value: depthImage,
          },
          jawOpenProgress: {
            value: 0,
          },
          eyeBlinkLeft: {
            value: 0,
          },
          eyeBlinkRight: {
            value: 0,
          },
          time: { value: 0 },
        },
        vertexShader: `
      varying vec2 vUv;
      varying vec3 vPos;
      void main (void) {
        vUv= uv;
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `,
        fragmentShader: `
      varying vec3 vPos;


const mat2 m = mat2(0.80,  0.60, -0.60,  0.80);

float noise(in vec2 p) {
  return sin(p.x)*sin(p.y);
}

float fbm4( vec2 p ) {
    float f = 0.0;
    f += 0.5000 * noise( p ); p = m * p * 2.02;
    f += 0.2500 * noise( p ); p = m * p * 2.03;
    f += 0.1250 * noise( p ); p = m * p * 2.01;
    f += 0.0625 * noise( p );
    return f / 0.9375;
}

float fbm6( vec2 p ) {
    float f = 0.0;
    f += 0.500000*(0.5+0.5*noise( p )); p = m*p*2.02;
    f += 0.250000*(0.5+0.5*noise( p )); p = m*p*2.03;
    f += 0.125000*(0.5+0.5*noise( p )); p = m*p*2.01;
    f += 0.062500*(0.5+0.5*noise( p )); p = m*p*2.04;
    f += 0.031250*(0.5+0.5*noise( p )); p = m*p*2.01;
    f += 0.015625*(0.5+0.5*noise( p ));
    return f/0.96875;
}

float pattern (vec2 p, float time) {
  float vout = fbm4(p + time + fbm6( p + fbm4( p + time )));
  return abs(vout);
}



      float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}



      uniform sampler2D face2;
      uniform sampler2D depthImage;
      uniform float time;
      uniform float jawOpenProgress;
      uniform float eyeBlinkLeft;
      uniform float eyeBlinkRight;
      varying vec2 vUv;

      void main (void) {

        vec4 faceColor = texture2D(face2, vUv);
        vec4 depthImageColor = texture2D(depthImage, vUv);

        vec4 faceFlashColor = texture2D(face2, vUv + faceColor.xy * jawOpenProgress * 1.0);

        gl_FragColor = vec4(vec3( 

          1.5 * pattern(vUv * 0.5 + 0.01, time),
          1.5 * pattern(vUv * 0.5, time),
          1.5 * pattern(vUv * 0.5 + -0.01, time)
          
        ), 1.0);


        }
    `,
      })
    );

    return sphere;
  }, [rtt]);

  useFrame((st, dt) => {
    sphere.material.uniforms.time.value += dt;

    st.gl.setRenderTarget(rtt);
    cubeCamera.update(st.gl, sphere);
    st.gl.setRenderTarget(null);
  });

  let bump = useTexture(`/ai/face/face03/texture_specular.png`);

  let { show, obj } = useMemo(() => {
    let obj = clone(glb.scene);

    obj.traverse((it: any) => {
      if (it.material) {
        if (it.material.name.toUpperCase().includes("HAIR")) {
          it.material.color = new Color("#0077ff");

          it.material = new MeshPhysicalMaterial({
            name: "HAIR",
            color: new Color("#00ccff"),
            map: face,
            normalMap: it.material.normalMap,
            emissive: new Color("#ffffff"),
            emissiveMap: face3,
            emissiveIntensity: 1,
            envMap: rtt.texture,
            envMapIntensity: 1.75,
            roughness: 0.0,
            metalness: 1.0,

            transmission: 1,
            transmissionMap: face2,
            reflectivity: 0,
          });

          face.flipY = false;
          face2.flipY = false;
          face3.flipY = false;
        }

        if (it.material.name.toUpperCase().includes("FACE")) {
          it.material = new MeshPhysicalMaterial({
            name: "FACE",
            color: new Color("#00ccff"),
            map: face,
            normalMap: it.material.normalMap,
            emissive: new Color("#ffffff"),
            emissiveMap: fbo.texture,
            emissiveIntensity: 1,
            envMap: rtt.texture,
            envMapIntensity: 1.75,
            roughness: 0.0,
            metalness: 1.0,

            displacementMap: bump,
            displacementScale: 0.1,

            transmission: 1,
            transmissionMap: face2,
            reflectivity: 0,
          });

          face.flipY = false;
          face2.flipY = false;
          face3.flipY = false;
        }

        //

        if (it.material.name.toUpperCase().includes("BACKHEAD")) {
          console.log(it.material.name);
          it.material = new MeshPhysicalMaterial({
            name: "FACE",
            color: new Color("#00ccff"),
            map: face,
            normalMap: it.material.normalMap,
            emissive: new Color("#000000"),
            emissiveMap: fbo.texture,
            emissiveIntensity: 1,
            envMap: rtt.texture,
            envMapIntensity: 1.75,
            roughness: 0.0,
            metalness: 1.0,
            transmission: 1,
            transmissionMap: fbo.texture,
            reflectivity: 0,
          });
        }
        // // it.materail.emissiveMap = it?.materail?.map || null;
        // it.material.roughness = 0;
        // it.material.metalness = 1;
      }
    });

    return {
      obj,
      show: <primitive object={obj}></primitive>,
    };
  }, [fbo]);

  useFrame(() => {
    //

    let list: any | { current: any[] } = dataFace?.current;
    let firstFace = list[0];
    if (firstFace) {
      //   console.log();

      obj.position.copy(firstFace.o3d.position);
      // obj.position.x *= 0.0;
      obj.position.z *= 0.0;
      obj.scale.copy(firstFace.o3d.scale);
      obj.rotation.copy(firstFace.o3d.rotation);

      sphere.rotation.copy(obj.rotation);
      cubeCamera.quaternion.copy(obj.quaternion);
      cubeCamera.rotation.x *= -1;
      cubeCamera.rotation.y *= -1;
      cubeCamera.rotation.z *= -1;

      obj.traverse((it: any) => {
        if (it?.geometry) {
          //
          if (it.morphTargetDictionary && it.morphTargetInfluences) {
            //
            let keys = Object.keys(it.morphTargetDictionary);

            // console.log(keys);

            keys.forEach((key) => {
              let idx = it.morphTargetDictionary[key];
              it.morphTargetInfluences[idx] = 0.0;

              let target = firstFace.morphTargets.find(
                (r: any) => r.categoryName === key
              );

              if (target) {
                it.morphTargetInfluences[idx] = target.score;
              }

              if (key === "jawOpen") {
                mesh.material.uniforms.jawOpenProgress.value =
                  target.score * 1.5;
              }
              if (key === "eyeBlinkLeft") {
                mesh.material.uniforms.eyeBlinkLeft.value = target.score * 1.5;
              }
              if (key === "eyeBlinkRight") {
                mesh.material.uniforms.eyeBlinkRight.value = target.score * 1.5;
              }
              //eyeBlinkRight

              //target
            });
          }
          // console.log(it);
        }
      });
    }
  });

  //

  return (
    <>
      <group scale={0.25}>{show}</group>
    </>
  );
}
