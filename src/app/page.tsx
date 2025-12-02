"use client";
export default function Home() {
  return (
    <div className="w-full h-full bg-white">
      <ul className="p-3">
        <div>{`Lok's facelab`}</div>

        <li className="text-block">
          <a href={`/raytrace`}>raytrace</a>
        </li>

        <li className="text-block">
          <a href={`/basic`}>basic</a>
        </li>

        {/*  */}
      </ul>
    </div>
  );
}
