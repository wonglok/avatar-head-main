"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import md5 from "md5";
import { Group } from "three/webgpu";
import { v4 } from "uuid";
// import { useFrame, useThree } from '@react-three/fiber'
// import { DoubleSide } from 'three/webgpu';
// import { Bvh } from '@react-three/drei'

export function GLBLoaderTSL({
  src,
  shadow = true,
  onItems = (v) => {},
}: {
  shadow?: boolean;
  src: string;
  onItems?: ({ items }: any) => void;
}) {
  let glb = useGLTF(src);
  glb.scene = useMemo(() => {
    return clone(glb.scene) as any;
  }, [glb?.scene?.uuid]);

  // let [outlet, setOutlet] = useState<any>({
  //     glb: null,
  //     display: null,
  // });

  useEffect(() => {
    let run = async () => {
      let array: any[] = [];
      let glbScene = glb.scene as Group;
      glbScene.traverse((it: any) => {
        if (it.geometry && it.material) {
          it.matchID = `${md5(
            it.name +
              it.type +
              it.material.name +
              it.material.type +
              it.geometry.name +
              it.geometry.type +
              it.geometry.attributes.position.count
          )}`;
          it.userData.matchID = it.matchID;

          array.push({
            _id: `${v4()}`,
            name: it.name,
            type: it.type,
            matchID: it.matchID,
          });
        }
      });

      onItems({ items: array, glbScene: glb.scene });

      // let glb = await glbLoader.loadAsync(`${src}`);

      if (shadow) {
        glb.scene.traverse((it: any) => {
          if (it.geometry) {
            it.castShadow = true;
            it.receiveShadow = true;
          }
        });
      }

      glb.scene.userData.isEnv = true;

      glb.scene.traverse((it: any) => {
        let hideList = ["roof", "glass", "wind", "plastic", "transparent"]; // , 'planks', 'ceiling'

        for (let eachHide of hideList) {
          if (it.material?.name?.toLowerCase().includes(eachHide)) {
            // it.visible = true;
            it.castShadow = false;
            it.receiveShadow = false;
          }

          if (it?.name?.toLowerCase().includes(eachHide)) {
            // it.visible = true;
            it.castShadow = false;
            it.receiveShadow = false;
          }
        }

        if (it.isLight) {
          if (!it.userData.originalIntensity) {
            it.userData.originalIntensity = it.intensity;
          }
          if (!it.userData.isLight) {
            it.userData.isLight = true;
          }
        }
      });

      // setOutlet({
      //     glb,
      //     display: <primitive object={glb.scene}></primitive>,
      // });
    };
    run();

    return () => {
      //
      //
    };
  }, [glb]);

  return (
    <>
      {/*  */}
      <group>
        <primitive object={glb.scene}></primitive>
      </group>

      {/*  */}
    </>
  );
}
