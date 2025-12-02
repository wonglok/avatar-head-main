"use client";
export default function Home() {
  return (
    <div className="w-full h-full bg-white">
      <ul className="p-3">
        <div>{`Lok's facelab`}</div>

        <li className="text-block">
          <a href={`/white`}>White light Version</a>
        </li>
        <li className="text-block">
          <a href={`/blue`}>Blue light Version</a>
        </li>
        <li className="text-block">
          <a href={`/shiny`}>Shiny Version</a>
        </li>
        <li className="text-block">
          <a href={`/contour`}>Contour Version</a>
        </li>
        <li className="text-block">
          <a href={`/contour2`}>Contour2 Version</a>
        </li>
        <li className="text-block">
          <a href={`/contour3`}>Contour3 Mouth move</a>
        </li>
        <li className="text-block">
          <a href={`/dyna-light`}>dyna-light</a>
        </li>
        <li className="text-block">
          <a href={`/dyna-light-face-03`}>dyna-light-face-03</a>
        </li>

        <li className="text-block">
          <a href={`/raytrace`}>raytrace</a>
        </li>

        {/*  */}
      </ul>
    </div>
  );
}
