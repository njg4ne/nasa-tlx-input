import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const scaleSvgText = await fetch("./scale.svg").then((res) => res.text())
const markerSvgText = await fetch("./marker.svg").then((res) => res.text())
const markerSvg = new DOMParser().parseFromString(markerSvgText, "image/svg+xml").documentElement
const markerG = markerSvg.querySelector("#nasa-tlx-marker-g")

const scaleSvg = new DOMParser().parseFromString(scaleSvgText, "image/svg+xml").documentElement
const scaleSvgWidth = scaleSvg.setAttribute("width", "100%")
const scaleSvgHeight = scaleSvg.removeAttribute("height")

document.querySelector("#container").innerHTML = scaleSvg.outerHTML



// document.querySelector("#container").addEventListener("click", (event) => {
//     // if the click touches the marker, do nothing
//     if (event.target.closest("#nasa-tlx-marker-g")) {
//         return
//     }
//     // otherwise create a new marker
//     const svg = document.querySelector("#container svg");
//     const point = svg.createSVGPoint();
//     point.x = event.clientX;
//     point.y = event.clientY;

//     const marker = findOrCreateMarker(svg)
//     marker.setAttribute("visibility", "hidden")
//     if (marker.parentNode !== svg) {
//         svg.appendChild(marker)
//     }
//     handlePointerEvent(event, svg, marker)
//     marker.setAttribute("visibility", "visible")
const svg = document.querySelector("#container svg");
d3.select(svg)
    .on("click", e => handlePointerEvent(e, svg))
    .call(d3.drag()
        .on("start", function () { })
        .on("drag", e => handlePointerEvent(e, svg))
        .on("end", function () { })
    )
// });

function findOrCreateMarker(svgEl) {
    let marker = document.querySelector("#nasa-tlx-marker-g")
    if (!marker) {
        marker = markerG.cloneNode(true)
    }
    if (marker.parentNode !== svgEl) {
        svgEl.appendChild(marker)
    }
    const basisCenter = findViewBoxCenter(svgEl, marker)
    marker.dataset.basisCx = basisCenter[0]
    marker.dataset.basisCy = basisCenter[1]
    const bBox = marker.getBBox()
    marker.dataset.width = bBox.width
    marker.dataset.height = bBox.height
    return marker;
}

function makeTranform(pointer, marker) {
    marker.removeAttribute("transform")
    const bounds = marker.getBBox()
    const markerWidth = bounds.width;
    const markerHeight = bounds.height;
    const x = pointer[0] - markerWidth / 2;
    const y = pointer[1] - markerHeight / 2;
    [marker.dataset.cX, marker.dataset.cY] = pointer
    return `translate(${x}, ${y})`
}
function isOOB(svgEl, elOnSvg) {
    const svgBounds = svgEl.getBoundingClientRect()
    const elBounds = elOnSvg.getBoundingClientRect()
    const topTooHigh = elBounds.top < svgBounds.top
    const bottomTooLow = elBounds.bottom > svgBounds.bottom
    const leftTooFarLeft = elBounds.left < svgBounds.left
    const rightTooFarRight = elBounds.right > svgBounds.right
    return topTooHigh || bottomTooLow || leftTooFarLeft || rightTooFarRight
}

function findScaleEnds(svgEl) {
    const startId = "nasa-tlx-tick-rect-1"
    const endId = "nasa-tlx-tick-rect-21"
    // find the center and put red dots there
    const start = svgEl.querySelector(`#${startId}`)
    const end = svgEl.querySelector(`#${endId}`)
    const sC = findViewBoxCenter(svgEl, start)
    const eC = findViewBoxCenter(svgEl, end)
    // const dot1 = findOrCreateDot(svgEl, sC, "nasa-tlx-dot-1")
    // const dot2 = findOrCreateDot(svgEl, eC, "nasa-tlx-dot-2")
    return [start.getBBox(), end.getBBox()]
}
findScaleEnds(document.querySelector("#container svg"))

function findViewBoxCenter(svg, el) {
    let { x, y, width: w, height: h } = el.getBBox()
    x = x + w / 2
    y = y + h / 2
    return [x, y]
}

function findOrCreateDot(svgEl, center, id) {
    let dot = svgEl.querySelector(`#${id}`);
    if (!dot) {
        dot = document.createElementNS("http://www.w3.org/2000/svg", "circle")
        dot.setAttribute("id", id)
        dot.setAttribute("r", 20)
        dot.setAttribute("fill", "red")
        dot.setAttribute("cx", center[0])
        dot.setAttribute("cy", center[1])
        svgEl.appendChild(dot)
    }
    return dot
}
function makeOrAdjustFrame(svg, marker) {
    let id = "marker-frame-rect"
    const rect = svg.querySelector(`#${id}`) || document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("id", id)
    rect.setAttribute("fill", "none")
    rect.setAttribute("stroke", "blue")
    rect.setAttribute("stroke-width", 5)
    rect.setAttribute("stroke-opacity", 0.75)
    rect.setAttribute("stroke-dasharray", "15,15")
    rect.setAttribute("pointer-events", "none")
    const bounds = marker.getBBox()
    const { x, y, width, height } = bounds
    rect.setAttribute("width", width)
    rect.setAttribute("height", height)
    rect.setAttribute("x", x)
    rect.setAttribute("y", y)
    rect.setAttribute("transform", marker.getAttribute("transform"))

    id = "marker-vline-rect"
    const rectLine = svg.querySelector(`#${id}`) || document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rectLine.setAttribute("id", id)
    rectLine.setAttribute("fill", "black")
    const vLineWidth = 1;
    rectLine.setAttribute("width", vLineWidth)
    const vLineHeight = 2 * svg.viewBox.baseVal.height
    rectLine.setAttribute("height", vLineHeight)
    const {cX, cY} = marker.dataset
    const transform = `translate(${cX}, 0)`
    rectLine.setAttribute("transform", transform)
   


    if (rectLine.parentNode !== svg) {
        svg.appendChild(rectLine)
        svg.insertBefore(marker, rectLine)
    }

    if (rect.parentNode !== svg) {
        svg.appendChild(rect)
        svg.insertBefore(marker, rect)
    }



    
    return rect
}


function handlePointerEvent(event, svg) {
    const marker = findOrCreateMarker(svg)
    const pointer = d3.pointer(event, svg)
    const viewBox = svg.viewBox.baseVal
    const { width, height } = marker.getBBox()
    const maxVbX = viewBox.x + viewBox.width - width / 2
    const maxVbY = viewBox.y + viewBox.height - height / 2
    const minVbX = viewBox.x + width / 2
    const minVbY = viewBox.y + height / 2

    const [sBox, eBox] = findScaleEnds(svg)
    const scaleStartX = sBox.x //+ sBox.width / 2
    const scaleEndX = eBox.x //+ eBox.width / 2
    pointer[0] = Math.max(scaleStartX, Math.min(maxVbX, pointer[0], scaleEndX))
    pointer[1] = Math.max(minVbY, Math.min(maxVbY, pointer[1]))


    marker.setAttribute("visibility", "hidden")
    marker.setAttribute("transform", makeTranform(pointer, marker))
    // makeOrAdjustFrame(svg, marker)
    marker.setAttribute("visibility", "visible")

}