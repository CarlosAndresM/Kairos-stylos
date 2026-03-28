self.addEventListener('push', function (event) {
  if (event.data) {
    const data = JSON.parse(event.data.text())
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/LOGO.png',
      })
    )
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow('/')
  )
})

// basic fetch handler to satisfy Chrome's PWA install criteria
self.addEventListener('fetch', function (event) {
  // simple bypass or minimal caching
})
