"use client";

import * as THREE from "three/webgpu";
import { Canvas, extend, ThreeToJSXElements } from "@react-three/fiber";
// import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectContorls, EffectsSSGI, getZustand } from "./EffectsSSGI";
import {
  DRACOLoader,
  GLTFLoader,
  HDRLoader,
} from "three/examples/jsm/Addons.js";
// import { Suspense } from 'react';
// import { GLBContent } from './GLBContent';
// import { transformGLB } from '../../lib/transformGLB.js'
// import { compress } from '@/app/actions/compress'

declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

extend(THREE as any);

export let rgbeLoader = new HDRLoader();

let draco = new DRACOLoader();
draco.setDecoderPath(`/draco/`);
export let glbLoader = new GLTFLoader();
glbLoader.setDRACOLoader(draco);

//
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const Context3D = createContext(getZustand());

export const useTSL = () => {
  let value = useContext(Context3D);
  return value;
};

export const TSLContext = ({ children, render = "basic" }: any) => {
  let value = useMemo(() => {
    return getZustand();
  }, []);
  let useLighting = value;
  let renderValue = useLighting((r) => r.render);

  useEffect(() => {
    if (typeof render === "string") {
      value.setState({
        render: render,
      });
    }
  }, [render]);

  return (
    <>
      {renderValue && (
        <Context3D.Provider value={value}>{children}</Context3D.Provider>
      )}
    </>
  );
};

export const CanvasTSL: any = ({
  eventSource = null,
  children,
}: {
  eventSource?: any;
  children?: any;
}) => {
  let ref = useRef<HTMLDivElement>(null);
  let useLighting = useTSL();
  let render = useLighting((r) => r.render);

  return (
    <>
      <div className="w-full h-full relative" ref={ref}>
        <Canvas
          dpr={1}
          shadows="soft"
          gl={async (props: any) => {
            const renderer = new THREE.WebGPURenderer({
              ...(props as any),
              antialias: render === "basic" ? true : false,
              alpha: false,
              depth: render === "basic" ? true : false,
              toneMapping: THREE.NoToneMapping,
              // multiview: true,
              requiredLimits: {
                //
                // maxColorAttachmentBytesPerSample: 40,
                maxColorAttachmentBytesPerSample: 60,
                //
                //
              },
            });

            await renderer.init();

            if (ref.current) {
              let rect = ref.current.getBoundingClientRect();
              renderer.setSize(rect.width, rect.height, true);
            }

            renderer.setPixelRatio(1);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            // SunlightObject.configureShadow({ renderer: renderer });

            return renderer;
          }}
        >
          <EffectsSSGI></EffectsSSGI>
          {children}
        </Canvas>
      </div>
    </>
  );
};

export function DayTimelineHUD() {
  return (
    <>
      <div className=" absolute bottom-0 left-0 w-full flex flex-col justify-center items-center">
        <EffectContorls></EffectContorls>
      </div>
    </>
  );
}

//
