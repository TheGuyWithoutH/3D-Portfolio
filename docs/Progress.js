function onProgress(percent) {
    const text = document.getElementById('loading-text')
    text.innerHTML = "Coding " + percent * 100 + "% of the website"
}

function removeProgress() {
    const text = document.getElementById('loading-text')
    text.remove()
}