

fetch('https://n.gardella.cc/nasa-tlx-input/')
    .then(response => response.text())
    .then(data => {
        console.log(data);
    })