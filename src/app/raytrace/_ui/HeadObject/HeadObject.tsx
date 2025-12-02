"use client";

import { Classifications } from "@mediapipe/tasks-vision";
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  EffectComposerContext,
} from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Color, Group, MathUtils, Matrix4 } from "three";
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

      <OrbitControls makeDefault object-position={[0, 0, 20]}></OrbitControls>

      <Environment
        // files={[
        //   // `/ai/hdri/satara_night_1k.hdr`,
        //   `/ai/equilrect/M3_Scifi_Concept_Art_equirectangular-jpg_sky_blue_night_with_2012439589_13370123.jpg`,
        // ]}
        //
        // preset="apartment"
        files={[`/ai/face/wonglok-frontface/environment.exr`]}
        blur={0.0}
      ></Environment>

      {/* <EffectComposer>
        <Bloom></Bloom>
      </EffectComposer> */}
      {/*  */}
      {/* <ambientLight intensity={1}></ambientLight> */}
    </>
  );
}

function Face({ dataFace }: { dataFace: any }) {
  let glb = useGLTF(
    `/ai/face/wonglok-frontface/wonglok-goodone-transformed-2k.glb`
  );

  let { show, obj } = useMemo(() => {
    let obj = clone(glb.scene);

    // obj.traverse((it: any) => {
    //   if (it.material) {
    //     it.material.color = new Color("#ffffff");
    //   }
    // });

    return {
      obj,
      show: <primitive object={obj}></primitive>,
    };
  }, []);

  useFrame((st) => {
    //
    if (st.camera) {
      st.camera.fov = 40;
      st.camera.aspect = st.size.width / st.size.height;
      st.camera.updateProjectionMatrix();
    }

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
                it.morphTargetInfluences[idx] = target.score * 0.7;
              }

              //target
            });
          }
          console.log(it);
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
