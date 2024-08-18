const FormData = require('form-data');

async function register({
  registerHook,
  registerSetting,
  storageManager,
  settingsManager,
  peertubeHelpers
}) {
  const { logger } = peertubeHelpers;

  // Register the allowed domains setting
  await registerSetting({
    name: 'allowedDomains',
    type: 'input-textarea',
    default: 'www.youtube.com',
    description: 'Comma-separated list of allowed domains (e.g., www.youtube.com,www.vimeo.com)',
  });

  // Hook: Pre-import URL acceptance
    registerHook({
      target: 'filter:api.video.pre-import-url.accept.result',
      handler: async (result, params) => {

    const videoUrl = params.videoImportBody.targetUrl;

        if (videoUrl) {
        // Convert the array-like string into an actual string
        const urlString = Object.values(videoUrl).join('');
      
        // Create a new URL object from the string
        const url = new URL(urlString);

        // Extract the domain (hostname)
        const domain = url.hostname;

        //logger.warn('Imported video domain:', domain);

        // Retrieve the allowed domains from the settings
        const allowedDomains = await settingsManager.getSetting('allowedDomains');
        const allowedDomainsList = allowedDomains.split(',').map(d => d.trim());

        // Check if the domain is in the allowed domains list
        if (allowedDomainsList.includes(domain)) {
          logger.info(`The domain ${domain} is allowed.`);
          
        } else {
          logger.warn(`The domain ${domain} is not allowed.`);
          return false;
        }
      } else {
        logger.error('No target URL found in videoImportBody');
      }
      return result;   
      }
    });
}

async function unregister () {
  return result;
}
module.exports = {
  register,
  unregister
};
