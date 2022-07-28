function onProgress(percent) {
    const text = document.getElementById('loading-text')
    text.innerHTML = "Coding " + (percent * 100).toPrecision(2) + "% of the website"
}

function removeProgress() {
    const text = document.getElementById('loading-div')
    text.remove()
}