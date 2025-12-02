"use client";
import { Suspense } from "react";
import { HeadObject } from "./_ui/HeadObject/HeadObject";
import { CanvasTSL, TSLContext } from "./CanvasTSL/CanvasTSL";

export default function Home() {
  return (
    <div className="w-full h-full bg-white">
      <TSLContext render="raytrace">
        <CanvasTSL>
          {/*  */}

          <Suspense fallback={null}>
            <HeadObject></HeadObject>
          </Suspense>
          {/*  */}
        </CanvasTSL>
      </TSLContext>
    </div>
  );
}
