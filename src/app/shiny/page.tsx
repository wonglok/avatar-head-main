"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { HeadObject } from "./_ui/HeadObject/HeadObject";

export default function Home() {
  return (
    <div className="w-full h-full bg-white">
      <Canvas>
        {/*  */}

        <Suspense fallback={null}>
          <HeadObject></HeadObject>
        </Suspense>
        {/*  */}
      </Canvas>
    </div>
  );
}
