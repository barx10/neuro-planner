// Sender rå lydbiter fra mikrofonen til hovedtråden. Egen fil fordi CSP ikke tillater inline- eller blob-skript.
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (channel) this.port.postMessage(channel.slice(0))
    return true
  }
}
registerProcessor('recorder', RecorderProcessor)
