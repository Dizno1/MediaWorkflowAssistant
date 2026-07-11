(function () {
  const byId = (id) => document.getElementById(id);
  const status = () => byId('shared-services-status');
  function announce(message) { if (status()) status().textContent = message; }
  function render() {
    const config = window.ODDSharedServices.getConfiguration();
    const parts = [];
    if (window.OpenAIProvider.getConfiguration().hasApiKey) parts.push('OpenAI configured');
    if (window.GeminiProvider.getConfiguration().hasApiKey) parts.push('Gemini configured');
    if (config.hasAzureSpeech) parts.push(`Azure Speech configured for ${config.region}`);
    if (config.hasAzureVision) parts.push('Azure Vision configured');
    byId('shared-services-summary').textContent = parts.length ? `${parts.join('. ')}. Credentials are encrypted in this browser profile.` : 'No SharedServices provider configuration has been imported yet.';
    byId('test-azure-speech-import').disabled = !config.hasAzureSpeech;
    byId('test-azure-vision-import').disabled = !config.hasAzureVision;
    byId('clear-shared-services-import').disabled = !config.hasAzureSpeech && !config.hasAzureVision;
  }
  function resultMessage(result) {
    const imported = result.imported.length ? result.imported.join(', ') : 'no complete provider configurations';
    return `Found ${result.found.length} recognized file${result.found.length === 1 ? '' : 's'}. Imported ${imported}. Original files were not changed.`;
  }
  byId('choose-shared-services-folder').addEventListener('click', async () => {
    announce('Choose the SharedServices folder.');
    try { const result = await window.ODDSharedServices.chooseDirectory(); announce(resultMessage(result)); render(); if (window.ProviderManagerUI) window.ProviderManagerUI.render(); }
    catch (error) { if (error.name !== 'AbortError') announce(error.message); }
  });
  byId('shared-services-files').addEventListener('change', async (event) => {
    if (!event.target.files.length) return;
    announce('Importing selected provider files.');
    try { const result = await window.ODDSharedServices.importFiles(event.target.files, 'Selected files'); announce(resultMessage(result)); render(); if (window.ProviderManagerUI) window.ProviderManagerUI.render(); }
    catch (error) { announce(error.message); }
    event.target.value = '';
  });
  byId('test-azure-speech-import').addEventListener('click', async () => { announce('Testing Azure Speech.'); try { announce((await window.ODDSharedServices.testAzureSpeech()).message); } catch (error) { announce(error.message); } });
  byId('test-azure-vision-import').addEventListener('click', async () => { announce('Testing Azure Vision.'); try { announce((await window.ODDSharedServices.testAzureVision()).message); } catch (error) { announce(error.message); } });
  byId('clear-shared-services-import').addEventListener('click', async () => { await window.ODDSharedServices.clear(); announce('Imported Azure SharedServices settings were cleared from this browser. Original files were not changed.'); render(); });
  document.addEventListener('shared-services-updated', render);
  document.addEventListener('provider-credentials-ready', render);
  document.addEventListener('DOMContentLoaded', render);
})();
