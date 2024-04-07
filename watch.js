function debounce(func, timeout = 300) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => func.apply(this, args), timeout)
    }
}

class Http {
    async post(target, data) {
        const formData = new FormData()
        for (let key in data) {
            formData.append(key, data[key])
        }

        return fetch(target, {
            method: 'POST',
            body: formData,
        })
    }
}

class LocalStorage {
    async get(key) {
        return (await chrome.storage.local.get(key))[key]
    }

    async set(key, value) {
        return await chrome.storage.local.set({[key]: value})
    }
}

class Dom {
    constructor() {
        this.body = document.querySelector('body')
        this.shareButton = null
        this.contentArea = null
        this.lastUrl = window.location.href
    }

    onReady(callback) {
        const observer = new MutationObserver(() => {
            this.shareButton = document.querySelector('.notion-topbar-share-menu')
            this.contentArea = document.querySelector('[data-content-editable-root]')

            if (!this.shareButton || !this.contentArea) {
                return
            }

            observer.disconnect()

            callback()
        })

        observer.observe(this.body, {childList: true, subtree: true})
    }

    onContentChange(callback) {
        const observer = new MutationObserver(() => {
            callback()
        })

        observer.observe(this.contentArea, {childList: true, subtree: true, characterData: true})
    }

    onUrlChange(callback) {
        const observer = new MutationObserver(() => {
            if (window.location.href !== this.lastUrl) {
                this.lastUrl = window.location.href
                callback()
            }
        })

        observer.observe(document, {subtree: true, childList: true})
    }
}

class SyncButton {
    constructor() {
        this.selector = '.nortta-button'
        this.element = document.createElement('div')
        this.element.classList.add('nortta-button')
        this.element.classList.add('nortta-button-sync')
        this.element.innerText = 'Sync'
    }

    remove() {
        this.element.remove()
    }

    disable() {
        this.element.classList.add('nortta-disabled')
        this.setText('Syncing')
    }

    enable() {
        this.element.classList.remove('nortta-disabled')
        this.setText('Sync')
    }

    onClick(callback) {
        this.element.addEventListener('click', callback)
    }

    setText(text) {
        this.element.innerText = text
    }
}

class Page {
    constructor(path) {
        this.path = path
    }

    id() {
        const fragments = this.path.split('-')
        const uuid = fragments[fragments.length - 1]

        return uuid.substring(0, 8) + '-' +
            uuid.substring(8, 12) + '-' +
            uuid.substring(12, 16) + '-' +
            uuid.substring(16, 20) + '-' +
            uuid.substring(20, 32)
    }
}

class Extension {
    constructor() {
        this.http = new Http()
        this.storage = new LocalStorage()
        this.dom = new Dom()
        this.button = null
        this.endpoint = null
        this.enableAutoSync = false
    }

    async start() {
        this.endpoint = await this.storage.get('endpoint')
        this.enableAutoSync = await this.storage.get('enableAutoSync')

        this.listenForPopupMessages()

        this.dom.onReady(() => {
            this.refresh()

            this.dom.onUrlChange(this.refresh.bind(this))
        })
    }

    refresh() {
        if (this.button) {
            this.button.remove()
        }

        if (this.endpoint) {
            this.addButton()
        }

        this.dom.onReady(() => {
            this.dom.onContentChange(debounce(this.autoSync.bind(this), 1000))
        })
    }

    sync() {
        this.button.disable()

        const page = new Page(window.location.pathname)

        this.http.post(this.endpoint, {id: page.id()})
            .finally(() => this.button.enable())
    }

    autoSync() {
        if (this.enableAutoSync) {
            this.sync()
        }
    }

    addButton() {
        this.button = new SyncButton()

        this.button.onClick(this.sync.bind(this))

        this.dom.shareButton.parentNode.insertBefore(this.button.element, this.dom.shareButton)
    }

    listenForPopupMessages() {
        chrome.runtime.onMessage.addListener(message => {
            if (message.key === 'endpoint') {
                this.endpoint = message.value
            }

            if (message.key === 'enableAutoSync') {
                this.enableAutoSync = message.value
            }

            this.debounvedRefresh ??= debounce(this.refresh.bind(this))

            this.debounvedRefresh()
        })
    }
}

const extension = new Extension()
extension.start()
