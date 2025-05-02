import './style.css'
import markerSvgText from "./marker.svg?raw";
import scaleSvgText from "./scale.svg?raw";
import * as d3 from "d3";

{/* <script src="https://cdn.jsdelivr.net/npm/d3@7" defer></script> */ }
// put this in and wait for the DOM to load
// fetch("https://cdn.jsdelivr.net/npm/d3@7").then((res) => res.text()).then((text) => {
//   const script = document.createElement("script");
//   script.textContent = text;
//   document.head.appendChild(script);
//   go(window.d3);
// });


// function go(d3) {
const SVG_NS = "http://www.w3.org/2000/svg"
const PRECISION = 0.25 // ratio of a percent

// const scaleSvgText = await fetch("https://n.gardella.cc/nasa-tlx-input/scale.svg").then((res) => res.text())
// const markerSvgText = await fetch("https://n.gardella.cc/nasa-tlx-input/marker.svg").then((res) => res.text())
// console.log("markerSvgText", markerSvgText)
const markerSvg = new DOMParser().parseFromString(markerSvgText, "image/svg+xml").documentElement
const markerG = markerSvg.querySelector("#nasa-tlx-marker-g")


const scaleSvg = new DOMParser().parseFromString(scaleSvgText, "image/svg+xml").documentElement
scaleSvg.setAttribute("width", "100%")
scaleSvg.removeAttribute("height")

const containerEl = document.querySelector("#nasa-tlx-input-container")

containerEl.innerHTML = scaleSvg.outerHTML
// containerEl.style.width = `${containerEl.clientWidth}px` // uncommennt to allow zoom to scale

const svgEl = document.querySelector("#nasa-tlx-input-container svg");
const svgD3 = d3.select(svgEl)
// Critical: accessibility features
const phantomSlider = document.createElement("input")
phantomSlider.setAttribute("class", "nasa-tlx-phantom-a11y-slider")
phantomSlider.setAttribute("type", "range")
phantomSlider.setAttribute("aria-label", "TLX") // needs to be more specific
phantomSlider.setAttribute("aria-valuenow", 0)
phantomSlider.setAttribute("aria-valuetext", "0 percent")
phantomSlider.setAttribute("aria-valuemin", 0)
phantomSlider.setAttribute("min", 0)
phantomSlider.setAttribute("aria-valuemax", 100)
phantomSlider.setAttribute("max", 100)
phantomSlider.setAttribute("aria-valuestep", PRECISION)
phantomSlider.setAttribute("step", PRECISION)
// aria hidden false
// phantomSlider.setAttribute("aria-hidden", "false")

function setPhantomSliderValue(value, updateDisplay = true) {
  phantomSlider.setAttribute("aria-valuenow", value)
  phantomSlider.setAttribute("value", value)
  phantomSlider.setAttribute("aria-valuetext", `${value} percent`)
  containerEl.dataset.value = `${value}%`
  containerEl.dataset.valuePrecision = `${PRECISION}%`
  if (window.parent !== window) {
    window.parent.postMessage({ type: "tlx-input-message", value: containerEl.dataset.value, valuePrecision: containerEl.dataset.valuePrecision }, "*")
  }

  phantomSlider.dataset.valuePercent = `${value}%`
  if (updateDisplay) displaySliderValue(value);
}
phantomSlider.onchange = (e) => {
  setPhantomSliderValue(e.target.value)
}
phantomSlider.oninput = (e) => {
  displaySliderValue(e.target.value)
}
let svgFocused = false;
phantomSlider.onfocus = () => {
  svgEl.classList.add("bordered")
}
phantomSlider.onblur = () => {
  svgEl.classList.remove("bordered")
}

containerEl.insertBefore(phantomSlider, svgEl)






svgD3
  .append(() => markerG.cloneNode(true))
  .attr("visibility", "hidden")
  // .attr("role", "img")
  // // alt text
  // .attr("alt", "NASA TLX slider display")
  .attr("aria-hidden", "true") // this is decorative and the range input is the focusable element
const markerEl = svgEl.querySelector("#nasa-tlx-marker-g")
const markerD3 = d3.select(markerEl)
const ticksEl = svgEl.querySelector("#ticks")
setGCenter(markerEl, 0, 0)

const { width: vbW, height: vbH } = svgEl.viewBox.baseVal

const firstTickEl = ticksEl.querySelector("#nasa-tlx-tick-rect-1")
const middleTickEl = ticksEl.querySelector("#nasa-tlx-tick-rect-11")
const lastTickEl = ticksEl.querySelector("#nasa-tlx-tick-rect-21")
const bounds = ticksEl.getBBox()
const [tickHalfWidth] = halfWidths(firstTickEl)
bounds.x += tickHalfWidth
bounds.width -= tickHalfWidth * 2

const [scaleStartX] = calcCenter(firstTickEl)
const FORCE_HEIGHT = (middleTickEl.getBBox().height)
const scaleStartY = firstTickEl.getBBox().y + firstTickEl.getBBox().height - FORCE_HEIGHT;

const [scaleEndX] = calcCenter(lastTickEl)
const scaleWidth = scaleEndX - scaleStartX
// const scaleHeight = firstTickEl.getBBox().height - firstTickEl.getBBox().width
const scaleHeight = FORCE_HEIGHT - firstTickEl.getBBox().width
const sW = 5;
const [, MARKER_FORCE_Y] = calcCenter(middleTickEl)
setGCenter(markerEl, scaleStartX, MARKER_FORCE_Y)
updateTransform(markerEl)
// markerD3.attr("visibility", "visible")


const indicatorRectD3 = svgD3.append("rect")
  .attr("id", "nasa-tlx-indicator-rect")
  .attr("fill", "lightblue")
  .attr("opacity", 0.75)
  .attr("width", scaleWidth)
  .attr("height", scaleHeight + sW)
  .attr("y", scaleStartY + sW / 2)
  .attr("x", scaleStartX)
  .attr("stroke", "black")
  .attr("stroke-width", sW)
  .attr("stroke-dasharray", "15,15")
  .attr("pointer-events", "none")
  .attr("visibility", "hidden")


// .attr("tabindex", -1)
// .attr("aria-label", "NASA TLX slider indicator")
// move to insert     "nasa-tlx-indicator-rect" before #white-bg-rect
const scaleGEl = svgEl.querySelector("#nasa-tlx-scale-500-tall")
const bgEl = scaleGEl.querySelector("#white-bg-rect")
const indicatorEl = svgEl.querySelector("#nasa-tlx-indicator-rect")
scaleGEl.insertBefore(indicatorEl, bgEl.nextSibling)

// indicatorRectD3.attr("visibility", "visible")

const activePointers = new Map();




const sixtyFpsMs = 1000 / 60; // 60 fps
const dragBehavior = d3.drag()
  .on("drag", (...x) => (throttle(followPointers(...x), sixtyFpsMs, this)))

svgD3
  .style("touch-action", "none")
  .on("touchstart touchend touchmove touchcancel", (e) => e.returnValue = false)
  .on("pointerdown", onPointerdown)
  .on("pointerup pointercancel", untrackPointer)
  .call(dragBehavior)

function onPointerdown(...x) { return (trackPointer(...x), followPointers(...x)) }
function followPointers(e) {
  const type = e.type;
  const isDrag = type === "drag";
  let pointers = isDrag ? d3.pointers(e, svgEl) : [...activePointers.values()];
  let [x, y] = keepInBounds(centroidOfPointers(pointers), markerEl);
  y = MARKER_FORCE_Y;
  const value = updateMarkerDisplay(x, y)

  setPhantomSliderValue(value, false)
  phantomSlider.focus()
  // debounce(setPhantomSliderValue(value), 1000)()
}

function updateMarkerDisplay(x, y) {
  setGCenter(markerEl, x, y)
  updateTransform(markerEl)
  markerD3.attr("visibility", "visible")
  indicatorRectD3
    .attr("width", Math.abs(markerEl.dataset.cx - scaleStartX))
    .attr("visibility", "visible")
  const value = describeValue()
  const roundedValue = Math.round(value / PRECISION) * PRECISION;
  setInfo(`Value: ${roundedValue.toFixed(2)}%`)
  return roundedValue

}

function describeValue() {
  const denominator = Math.abs(scaleEndX - scaleStartX)
  const numerator = Math.abs(markerEl.dataset.cx - scaleStartX)
  const percent = numerator / denominator * 100
  return percent
}
function displaySliderValue(percent) {
  const ratio = percent / 100
  const denominator = Math.abs(scaleEndX - scaleStartX)
  const numerator = denominator * ratio
  updateMarkerDisplay(scaleStartX + numerator, MARKER_FORCE_Y)

}


function trackPointer(e) {
  const { pointerId: id } = e;
  activePointers.set(id, centroidOfPointers(d3.pointers(e, svgEl)));
}
function untrackPointer(e) {
  const { pointerId: id } = e;
  activePointers.delete(id);
}

function keepInBounds([x, y], el) {
  // const { width: elW, height: elH } = el.getBBox()
  // const [elHW, elHH] = halfWidths(el);
  const { x: bX, y: bY, width: bW, height: bH } = bounds
  const bTrailX = bX + bW, bTrailY = bY + bH;
  // Removed: if the marker is taller or wider than the bounds, return the input
  // if (elW > bW || elH > bH) return [x, y]; 
  const cx = Math.max(bX /*+ elHW*/, Math.min(x, bTrailX /*- elHW*/))
  const cy = Math.max(bY /*+ elHH*/, Math.min(y, bTrailY /*- elHH*/))
  return [cx, cy]
}

function calcCenter(el) {
  const { x, y, width: w, height: h } = el.getBBox()
  return [x + w / 2, y + h / 2]
}

function setGCenter(el, cx, cy) {
  el.dataset.cx = cx
  el.dataset.cy = cy
}
function getGCenter(el) {
  return [el.dataset.cx, el.dataset.cy]
}
function updateTransform(el) {
  const [cx, cy] = getGCenter(el)
  const [dx, dy] = halfWidths(el)
  const transform = `translate(${cx - dx}, ${cy - dy})`
  el.setAttribute("transform", transform)

}
function halfWidths(el) {
  const { width: w, height: h } = el.getBBox()
  return [w / 2, h / 2]
}
function centroidOfPointers(pointers) {
  const n = pointers.length;
  let pointer = pointers.at(0) || [NaN, NaN];
  if (n === 1) {
    pointer = pointers.at(0);
  } else if (n === 2) {
    const [[x0, y0], [x1, y1]] = pointers;
    pointer = [(x0 + x1) / 2, (y0 + y1) / 2];
  }
  else if (n > 2) {
    pointer = d3.polygonCentroid(pointers);
  }
  return pointer;
}

// https://remysharp.com/2010/07/21/throttling-function-calls
function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
    deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
      args = arguments,
      event = d3.event;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        d3.event = event;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      d3.event = event;
      fn.apply(context, args);
    }
  };
}

function setInfo(text) {
  // document.querySelector("#info").innerText = text
}
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
// }