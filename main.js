const { URL } = require('url');

async function register({ registerHook, registerSetting, settingsManager, moderation }) {
  // Register a setting for allowed domains
  await registerSetting({
    name: 'allowedDomains',
    type: 'input-textarea',
    default: 'youtube.com',
    description: 'Comma-separated list of allowed domains (e.g., youtube.com,vimeo.com)',
  });

  // Hook to filter video imports based on the accept list
  registerHook({
    target: 'filter:api.video.pre-import-url.accept.result',
    handler: async ({ input, result, helpers }) => {
      try {
        // Ensure input and input.video-import-targetUrl are defined
        if (!input || !input['video-import-targetUrl']) {
          console.error('Input or video-import-targetUrl is undefined', { input, result });
          return { accepted: false, save: false };
        }

        const allowedDomains = (await settingsManager.getSetting('allowedDomains')).split(',').map(d => d.trim());
        const parsedUrl = new URL(input['video-import-targetUrl']);
        const domain = parsedUrl.hostname.replace(/^www\./, '');

        // If the domain is not in the allowed list, reject the URL
        if (!allowedDomains.includes(domain)) {
          return {
            accepted: false, // Do not accept for saving
            save: false, // Ensure it's not saved
          };
        }

        // Domain is allowed, proceed with saving the video
        return { accepted: true, save: true };
      } catch (error) {
        console.error('Error in filter:api.video.pre-import-url.accept.result hook:', error);
        return { accepted: false, save: false };
      }
    }
  });

  // Check if 'action:video-imported' hook is supported
  try {
    registerHook({
      target: 'action:video-imported',
      handler: async ({ video }) => {
        try {
          const allowedDomains = (await settingsManager.getSetting('allowedDomains')).split(',').map(d => d.trim());
          const videoDomain = new URL(video.referenceUrl).hostname.replace(/^www\./, '');

          if (!allowedDomains.includes(videoDomain)) {
            // Block the video if it's from a disallowed domain
            await moderation.blacklistVideo(video.uuid, { reason: 'Blocked due to non-accepted domain' });
          }
        } catch (error) {
          console.error('Error processing imported video:', error);
        }
      }
    });
  } catch (error) {
    console.warn('Warning: Could not register action:video-imported hook. The hook may not be supported.', error);
  }
}

async function unregister() {
  // Cleanup logic if needed
}

module.exports = { register, unregister };
