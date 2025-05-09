import { PropTypes } from "prop-types";

export default function QRPositionMarker({
  children,
  width,
  height,
  result,
  mirror,
  flash = true,
  flashDelay = "0s",
  hidden = false,
}) {
  let marker = null;

  if (width && height && result?.vertices) {
    const points = result.vertices.map((v) => v.join(",")).join(" ");
    marker = (
      <svg
        aria-hidden="true"
        // fill="lightgreen"
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: flash
            ? `0.2s steps(3, jump-start) ${flashDelay} 3 flash`
            : "none",
        }}
      >
        <polygon
          fill="none"
          stroke="#88FF00"
          strokeWidth="2%"
          strokeLinejoin="round"
          strokeOpacity="0.9"
          points={`${points.trim()}`}
        ></polygon>
      </svg>
    );
  }

  const styles = {
    position: "relative",
    padding: 0,
    margin: 0,
    display: hidden ? "none" : "block",
    transform: mirror ? "scaleX(-1)" : "none",
  };

  return (
    <div style={styles}>
      {children}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          margin: 0,
          padding: 0,
          top: 0,
          left: 0,
        }}
      >
        {marker}
      </div>
    </div>
  );
}

QRPositionMarker.propTypes = {
  children: PropTypes.node,
  width: PropTypes.number,
  height: PropTypes.number,
  result: PropTypes.object,
  mirror: PropTypes.bool,
  flash: PropTypes.bool,
  flashDelay: PropTypes.string,
  hidden: PropTypes.bool,
};
