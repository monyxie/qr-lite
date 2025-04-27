import { useId } from "react";

const DURATION = "2s";

export function Spinner() {
  const id = useId();
  return (
    <svg height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={`${id}-eyelid-clip`}>
          <ellipse
            id={`${id}-eyelid`}
            cx="50"
            cy="50"
            rx="25"
            ry="25"
            strokeWidth="10"
            stroke="#333"
            fill="none"
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-eyelid-clip)`}>
        <ellipse rx="15" ry="15" cx="50" cy="50" stroke="none" fill="#333">
          <animate
            attributeName="cx"
            values="47.5;47.5;47.5;52.5;52.5;52.5;47.5"
            keyTimes="0;0.1;0.35;0.5;0.6;0.85;1"
            dur="4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            values="52.5;52.5;47.5;52.5;52.5;47.5;52.5"
            keyTimes="0;0.1;0.35;0.5;0.6;0.85;1"
            dur="4s"
            repeatCount="indefinite"
          />
        </ellipse>
      </g>
      <ellipse
        cx="50"
        cy="50"
        rx="25"
        ry="25"
        strokeWidth="10"
        stroke="#333"
        fill="none"
      >
        <animate
          attributeName="ry"
          values="25;0;25;0;25"
          keyTimes="0;0.05;0.1;0.15;0.2"
          dur={DURATION}
          repeatCount="indefinite"
        />
      </ellipse>
    </svg>
  );
}
