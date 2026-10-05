let intervalId: number | undefined

function start() {
  if (intervalId !== undefined) return
  postMessage(Date.now())
  intervalId = self.setInterval(() => postMessage(Date.now()), 1000)
}

function stop() {
  if (intervalId !== undefined) {
    clearInterval(intervalId)
    intervalId = undefined
  }
}

self.onmessage = (event: MessageEvent<'start' | 'stop'>) => {
  if (event.data === 'start') start()
  if (event.data === 'stop') stop()
}

export {}
