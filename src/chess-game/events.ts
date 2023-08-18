export type EventListener = (data?: any) => void

export default class EventEmitter {
  events: any

  constructor() {
    this.events = {}
  }

  once(name: string, listener: EventListener) {
    const wrapper = () => {
      listener()
      this.off(name, listener)
    }

    this.on(name, wrapper)
  }

  on(name: string, listener: EventListener) {
    if (!this.events[name]) this.events[name] = []
    this.events[name].push(listener)
  }

  off(name: string, listener: EventListener) {
    if (!this.events[name]) return
    this.events[name] = this.events[name].filter((l: EventListener) => l !== listener)
  }

  emit(name: string, data?: any) {
    if (!this.events[name]) return
    for (const event of this.events[name]) event(data)
  }
}
