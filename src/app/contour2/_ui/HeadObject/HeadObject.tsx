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
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  ShaderMaterial,
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
          brightness={-0.45}
        ></BrightnessContrast>
      </EffectComposer>
      {/* <ambientLight intensity={1}></ambientLight> */}

      <color attach={"background"} args={["#000000"]}></color>
    </>
  );
}

function Face({ dataFace }: { dataFace: any }) {
  let glb = useGLTF(`/ai/face/face-002.glb`);

  let { face, face2, face3, dudvTex } = useTexture({
    // good
    face: `/ai/facetexture/image2-face.png`,

    // good
    face2: `/ai/facetexture/image2-face.png`,

    // good
    face3: `/ai/facetexture/image2-face.png`,

    dudvTex: `/ai/facetexture/dpethimageface.png`,
  });

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
        dudvTex: {
          value: dudvTex,
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
      uniform sampler2D face2;
      uniform sampler2D dudvTex;
      uniform float time;
      varying vec2 vUv;
      void main (void) {

        vec4 dudv = texture2D(face2, vUv);
        vec4 color = texture2D(face2, dudv.yy + dudv.yy * sin(dudv.xx + time * 2.0) * 1.5);
      
        gl_FragColor = vec4(color.rgb + 0.1 * sin(time * 3.0), 1.0);
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

  let { show, obj } = useMemo(() => {
    let obj = clone(glb.scene);

    obj.traverse((it: any) => {
      if (it.material) {
        if (it.material.name.toUpperCase().includes("HAIR")) {
          it.material.color = new Color("#0077ff");

          it.material = new MeshPhysicalMaterial({
            name: "HAIR",
            color: new Color("#000000"),
            map: face,
            normalMap: it.material.normalMap,
            emissive: new Color("#00ccff"),
            emissiveMap: face3,
            emissiveIntensity: 2.5,
            roughness: 0.5,
            roughnessMap: face2,
            metalnessMap: face2,
            transmission: 1,
            transmissionMap: face2,
            reflectivity: 0.3,
          });

          face.flipY = false;
          face2.flipY = false;
          face3.flipY = false;
        }
        if (it.material.name.toUpperCase().includes("FACE")) {
          it.material = new MeshPhysicalMaterial({
            name: "FACE",
            color: new Color("#000000"),
            map: face,
            normalMap: it.material.normalMap,
            emissive: new Color("#00ccff"),
            emissiveMap: fbo.texture,
            emissiveIntensity: 2.5,
            roughness: 0.5,
            roughnessMap: face2,
            metalnessMap: face2,
            transmission: 1,
            transmissionMap: face2,
            reflectivity: 0.3,
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
            color: new Color("#000000"),
            map: face,
            normalMap: it.material.normalMap,
            emissive: new Color("#00ccff"),
            emissiveMap: fbo.texture,
            emissiveIntensity: 2.5,
            roughness: 0.5,
            roughnessMap: face2,
            metalnessMap: face2,
            transmission: 1,
            transmissionMap: face2,
            reflectivity: 0.3,
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

      obj.traverse((it: any) => {
        if (it?.geometry) {
          //
          if (it.morphTargetDictionary && it.morphTargetInfluences) {
            //
            let keys = Object.keys(it.morphTargetDictionary);

            keys.forEach((key) => {
              let idx = it.morphTargetDictionary[key];
              it.morphTargetInfluences[idx] = 0.0;

              let target = firstFace.morphTargets.find(
                (r: any) => r.categoryName === key
              );

              if (target) {
                it.morphTargetInfluences[idx] = target.score;
              }

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
