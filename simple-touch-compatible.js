import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
setInfo(`Max touch points: ${navigator.maxTouchPoints}`)
const width = 1000;
const height = 200;

const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("stroke-width", 2)
    .style("touch-action", "none")

document.querySelector("#container").innerHTML = svg.node().outerHTML

const radius = 20;

const svgEl = document.querySelector("#container svg")

const activePointers = new Map();
function trackPointer(e) {
    const { pointerId: id } = e;
    activePointers.set(id, centroidOfPointers(d3.pointers(e, svgEl)));
}
function untrackPointer(e) {
    const { pointerId: id } = e;
    activePointers.delete(id);
}

// update threshold for 60fps 
const thresh = 1000 / 60; // 60 fps

d3.select(svgEl)
    .on("touchstart touchend touchmove touchcancel", (e) => e.returnValue = false)
    .on("pointerdown", (...x) => (trackPointer(...x), followPointers(...x)))
    .on("pointerup pointercancel", untrackPointer)
    .call(d3.drag()
        .on("drag", (...x) => (throttle(followPointers(...x), thresh, this))))
    .selectAll("circle")
    .data([{
        x: Math.random() * (width - radius * 2) + radius,
        y: Math.random() * (height - radius * 2) + radius,
    }])
    .join("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", radius)
    .attr("fill", (d, i) => d3.schemeCategory10[i % 10])


function svgPoint(event) {
    // Select the circle element directly
    const circle = d3.select(svgEl).select("circle");
    const pointer = d3.pointer(event, svgEl);
    // Update the circle's position based on the drag event
    circle.attr("cx", pointer[0])
        .attr("cy", pointer[1]);
}
function followPointers(event) {
    const type = event.type;
    const isDrag = type === "drag";
    let pointers = isDrag ? d3.pointers(event, svgEl) : [...activePointers.values()];
    const [x, y] = centroidOfPointers(pointers);
    d3.select(svgEl)
        .select("circle")
        .attr("cx", x) // assignment returns the assigned value
        .attr("cy", y);
}

function setInfo(text) {
    document.querySelector("#info").innerText = text
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