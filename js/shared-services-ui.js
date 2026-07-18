(function () {
  const byId = (id) => document.getElementById(id);
  const status = () => byId('shared-services-status');
  function announce(message) { if (status()) status().textContent = message; }
  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  }
  async function render() {
    const config = window.ODDSharedServices.getConfiguration();
    const directory = await window.ODDSharedServices.getDirectoryStatus();
    const parts = [];
    if (window.OpenAIProvider.getConfiguration().hasApiKey) parts.push('OpenAI');
    if (window.GeminiProvider.getConfiguration().hasApiKey) parts.push('Gemini');
    if (config.hasAzureSpeech) parts.push('Azure Speech');
    if (config.hasAzureVision) parts.push('Azure Vision');
    const importedAt = formatDate(config.importedAt);
    byId('shared-services-summary').textContent = parts.length
      ? `${parts.length} provider services configured: ${parts.join(', ')}.${importedAt ? ` Imported ${importedAt}.` : ''} Credentials are encrypted in this browser profile.`
      : 'No shared provider configuration has been imported yet.';
    byId('shared-services-location').textContent = directory.remembered
      ? `Remembered folder: ${directory.name}. Access is ${directory.permission === 'granted' ? 'available' : 'waiting for your permission'}.`
      : 'No Apps folder is remembered yet.';
    byId('reconnect-shared-services-folder').disabled = !directory.remembered;
    byId('retest-shared-services').disabled = !parts.length;
    byId('test-azure-speech-import').disabled = !config.hasAzureSpeech;
    byId('test-azure-vision-import').disabled = !config.hasAzureVision;
    byId('clear-shared-services-import').disabled = !parts.length && !directory.remembered;
    byId('shared-services-setup').hidden = parts.length > 0;
    byId('shared-services-maintenance').hidden = parts.length === 0;
  }
  function resultMessage(result) {
    const imported = result.imported.length ? result.imported.join(', ') : 'no complete provider configurations';
    const rejectedNote = result.rejected && result.rejected.length ? ` ${result.rejected.join('. ')}.` : '';
    return `Found ${result.found.length} recognized files in ${result.sourceLabel}. Imported ${imported}. The original files were not changed.${rejectedNote}`;
  }
  async function testAll() {
    announce('Testing configured provider connections. No workflow is being started.');
    const results = await window.ODDSharedServices.testAllConnections();
    if (!results.length) { announce('No configured provider connections were available to test.'); return; }
    const message = results.map((item) => item.ok ? `${item.name}: connected` : `${item.name}: ${item.message}`).join('. ');
    announce(message + '.');
    if (window.ProviderManagerUI) window.ProviderManagerUI.render();
  }
  byId('choose-apps-folder').addEventListener('click', async () => {
    announce('Select the Apps folder that contains SharedServices.');
    try {
      const result = await window.ODDSharedServices.chooseAppsDirectory();
      announce(resultMessage(result));
      await render();
      if (window.ProviderManagerUI) window.ProviderManagerUI.render();
      await testAll();
    } catch (error) { if (error.name !== 'AbortError') announce(error.message); }
  });
  byId('reconnect-shared-services-folder').addEventListener('click', async () => {
    announce('Reconnecting to the remembered Apps folder.');
    try {
      const result = await window.ODDSharedServices.reconnectSavedDirectory();
      announce(resultMessage(result)); await render(); if (window.ProviderManagerUI) window.ProviderManagerUI.render();
    } catch (error) { if (error.name !== 'AbortError') announce(error.message); }
  });
  byId('shared-services-files').addEventListener('change', async (event) => {
    if (!event.target.files.length) return;
    announce('Importing selected provider files.');
    try { const result = await window.ODDSharedServices.importFiles(event.target.files, 'Selected files'); announce(resultMessage(result)); await render(); if (window.ProviderManagerUI) window.ProviderManagerUI.render(); await testAll(); }
    catch (error) { announce(error.message); }
    event.target.value = '';
  });
  byId('retest-shared-services').addEventListener('click', testAll);
  byId('test-azure-speech-import').addEventListener('click', async () => { announce('Testing Azure Speech.'); try { announce((await window.ODDSharedServices.testAzureSpeech()).message); } catch (error) { announce(error.message); } });
  byId('test-azure-vision-import').addEventListener('click', async () => { announce('Testing Azure Vision.'); try { announce((await window.ODDSharedServices.testAzureVision()).message); } catch (error) { announce(error.message); } });
  byId('clear-shared-services-import').addEventListener('click', async () => { await window.ODDSharedServices.clear(); announce('Imported SharedServices settings and the remembered folder were cleared from this browser. Original files were not changed.'); await render(); });
  document.addEventListener('shared-services-updated', render);
  document.addEventListener('provider-credentials-ready', render);
  document.addEventListener('DOMContentLoaded', render);
})();
