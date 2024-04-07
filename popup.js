const endpoint = document.getElementById('endpoint')
const enableAutoSync = document.getElementById('enableAutoSync')

chrome.storage.local.get(['endpoint', 'enableAutoSync'], function (data) {
    if (data.endpoint) {
        endpoint.value = data.endpoint
    }

    if (data.enableAutoSync) {
        enableAutoSync.checked = !!data.enableAutoSync
    }
})

endpoint.oninput = function () {
    sendMessageToActiveTab({ key: 'endpoint', value: endpoint.value })

    chrome.storage.local.set({ endpoint: endpoint.value })
}

enableAutoSync.onchange = function () {
    sendMessageToActiveTab({ key: 'enableAutoSync', value: enableAutoSync.checked })

    chrome.storage.local.set({ enableAutoSync: enableAutoSync.checked })
}

async function sendMessageToActiveTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if(new URL(tab.url).hostname === 'www.notion.so') {
        await chrome.tabs.sendMessage(tab.id, message);
    }
}
