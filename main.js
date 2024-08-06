const simpleGet = require('simple-get')

const store = {
  urls: [],
  checkIntervalSeconds: null,
  alreadyAdded: new Set(),
  alreadyRemoved: new Set(),
  timeout: null
}

async function register ({
  settingsManager,
  storageManager,
  peertubeHelpers,
  registerSetting
}) {
  const { logger } = peertubeHelpers

  registerSetting({
    name: 'blocklist-urls',
    label: 'Blocklist Base URLs (one per line)',
    type: 'input-textarea',
    private: true
  })

  registerSetting({
    name: 'check-seconds-interval',
    label: 'Blocklist check frequency (seconds)',
    type: 'input',
    private: true,
    default: 3600 // 1 Hour
  })

  const settings = await settingsManager.getSettings([ 'check-seconds-interval', 'blocklist-urls' ])

  await load(peertubeHelpers, storageManager, settings['blocklist-urls'], settings['check-seconds-interval'])

  settingsManager.onSettingsChange(settings => {
    load(peertubeHelpers, storageManager, settings['blocklist-urls'], settings['check-seconds-interval'])
      .catch(err => logger.error('Cannot load auto block videos plugin.', { err }))
  })
}

async function unregister () {
  return
}

module.exports = {
  register,
  unregister
}

// ############################################################################

async function load (peertubeHelpers, storageManager, blocklistUrls, checkIntervalSeconds) {
  const { logger } = peertubeHelpers

  if (store.timeout) clearTimeout(store.timeout)

  store.checkIntervalSeconds = checkIntervalSeconds

  store.urls = (blocklistUrls || '').split('\n')
                                    .filter(url => !!url)

  if (store.urls.length === 0) {
    logger.info('Do not load auto block videos plugin because of empty blocklist URLs.')
    return
  }

  logger.info('Loaded %d blocklist URLs for auto block videos plugin.', store.urls.length, { urls: store.urls })

  runLater(peertubeHelpers, storageManager)
}

async function runCheck (peertubeHelpers, storageManager) {
  const { logger } = peertubeHelpers

  if (store.urls.length === 0) return runLater(peertubeHelpers, storageManager)

  let lastChecks = await storageManager.getData('last-checks')
  if (!lastChecks) lastChecks = {}

  const newLastCheck = {}

  for (const url of store.urls) {
    try {
      newLastCheck[url] = new Date().toISOString()
      await blockVideosFromDomain(peertubeHelpers, url)
    } catch (err) {
      logger.warn('Cannot auto block videos from %s.', url, { err })
    }
  }

  await storageManager.storeData('last-checks', newLastCheck)

  runLater(peertubeHelpers, storageManager)
}

async function blockVideosFromDomain (peertubeHelpers, domain) {
  const { moderation, videos, logger } = peertubeHelpers

  logger.info('Blocking all videos from domain %s.', domain)

  const allVideos = await videos.list({})
  for (const video of allVideos.data) {
    if (video.url.includes(new URL(domain).hostname)) {
      if (store.alreadyAdded.has(video.url)) continue

      store.alreadyRemoved.delete(video.url)
      store.alreadyAdded.add(video.url)

      if (video.remote !== true) {
        logger.info('Do not auto block our own video %s.', video.url)
        continue
      }

      logger.info('Auto block video %s from blocklist domain %s.', video.url, domain)

      const reason = 'Automatically blocked from auto block plugin due to blocked domain.'
      await moderation.blacklistVideo({ videoIdOrUUID: video.id, createOptions: { reason } })
    }
  }
}

function runLater (peertubeHelpers, storageManager) {
  const { logger } = peertubeHelpers

  logger.debug('Will run auto videos block check in %d seconds.', store.checkIntervalSeconds)

  store.timeout = setTimeout(() => {
    runCheck(peertubeHelpers, storageManager)
  }, store.checkIntervalSeconds * 1000)
}
