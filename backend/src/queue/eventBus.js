// Simple in-memory event bus (replace with Redis/RabbitMQ in production)
const eventListeners = {}

export const publishEvent = async (eventType, data) => {
  console.log(`[Event] ${eventType}:`, data)

  if (eventListeners[eventType]) {
    for (const listener of eventListeners[eventType]) {
      try {
        await listener(data)
      } catch (error) {
        console.error(`Error in ${eventType} listener:`, error)
      }
    }
  }
}

export const subscribeToEvent = (eventType, listener) => {
  if (!eventListeners[eventType]) {
    eventListeners[eventType] = []
  }
  eventListeners[eventType].push(listener)
}

export const unsubscribeFromEvent = (eventType, listener) => {
  if (eventListeners[eventType]) {
    eventListeners[eventType] = eventListeners[eventType].filter((l) => l !== listener)
  }
}
