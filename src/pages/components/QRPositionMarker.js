import { PropTypes } from "prop-types";

export default function QRPositionMarker({
  image,
  width,
  height,
  result,
  mirror,
  flash = true,
  flashDelay = "0s",
  className = "",
}) {
  let points = "";
  if (width && height && result?.vertices) {
    points = result.vertices.map((v) => v.join(",")).join(" ");
  }

  const styles = {
    transform: mirror ? "scaleX(-1)" : "none",
  };

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className} style={styles}
    >
      {image && <image href={image} x="0" y="0" width={width} height={height} />}
      {points && <polygon
        style={{
          animation: flash
            ? `0.2s steps(3, jump-start) ${flashDelay} 3 flash`
            : "none",
        }}
        fill="none"
        stroke="#88FF00"
        strokeWidth="2%"
        strokeLinejoin="round"
        strokeOpacity="0.9"
        points={`${points.trim()}`}
      />}
    </svg>
  );
}

QRPositionMarker.propTypes = {
  image: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  result: PropTypes.object,
  mirror: PropTypes.bool,
  flash: PropTypes.bool,
  flashDelay: PropTypes.string,
  hidden: PropTypes.bool,
  className: PropTypes.string,
};
