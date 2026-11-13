// An SVG drawing as a CSS image (`backgroundImage: svgPicture(svg)`): the one
// way the interface turns markup it builds into a picture (a die's face, a
// bubble's shape, a panel bar's notch).
export function svgPicture(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
