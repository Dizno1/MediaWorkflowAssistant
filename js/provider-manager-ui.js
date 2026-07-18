(function () {
  const byId = (id) => document.getElementById(id);
  const status = byId('ai-provider-status');
  function setStatus(message) { if (status) status.textContent = message; }
  function revealToggle(toggleId, inputId) { const toggle = byId(toggleId); const input = byId(inputId); if (!toggle || !input) return; toggle.addEventListener('change', () => { input.type = toggle.checked ? 'text' : 'password'; }); }
  function formatTested(value) { if (!value) return 'Not tested yet.'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Not tested yet.' : `Last tested ${date.toLocaleString()}.`; }

  function render() {
    const openai = window.OpenAIProvider.getConfiguration();
    byId('openai-configuration-status').textContent = openai.hasApiKey ? `Configured. ${formatTested(openai.lastTestedAt)}` : 'Not configured. Paste a key and save it.';
    const gemini = window.GeminiProvider.getConfiguration();
    byId('gemini-configuration-status').textContent = gemini.hasApiKey ? `Configured. ${formatTested(gemini.lastTestedAt)}` : 'Not configured. Paste a key and save it.';
    const anthropic = window.AnthropicProvider.getConfiguration();
    byId('anthropic-model').value = anthropic.model;
    byId('anthropic-configuration-status').textContent = anthropic.hasApiKey ? `Configured. ${formatTested(anthropic.lastTestedAt)}` : 'Not configured. Paste a key and save it.';
    const local = window.LocalServiceProvider.getConfiguration();
    byId('ollama-endpoint').value = local.ollamaEndpoint || 'http://localhost:11434'; byId('ollama-model').value = local.ollamaModel || '';
    byId('whisper-endpoint').value = local.whisperEndpoint || 'http://localhost:9000/transcribe'; byId('whisper-model').value = local.whisperModel || 'base';
    byId('local-configuration-status').textContent = `${local.ollamaAvailable ? 'Ollama available.' : 'Ollama not detected.'} ${local.whisperAvailable ? 'Local Whisper available.' : 'Local Whisper not detected.'}`;
    renderAzure();
    const shared = window.ODDSharedServices ? window.ODDSharedServices.getConfiguration() : { hasAzureSpeech: false, hasAzureVision: false };
    const configured = [
      openai.hasApiKey,
      window.AzureOpenAIProvider.getConfiguration().hasApiKey,
      gemini.hasApiKey,
      anthropic.hasApiKey,
      local.ollamaAvailable || local.whisperAvailable,
      shared.hasAzureSpeech,
      shared.hasAzureVision
    ].filter(Boolean).length;
    byId('provider-manager-summary').textContent = `${configured} provider group${configured === 1 ? '' : 's'} configured. Keys remain encrypted in this browser profile and are not included in project exports.`;
  }

  function renderAzure() {
    const config = window.AzureOpenAIProvider.getConfiguration(); const select = byId('azure-profile-select');
    const prior = select.value; select.innerHTML = '<option value="">New Azure resource</option>' + config.profiles.map((profile) => `<option value="${profile.id}">${escapeHtml(profile.name)}${profile.id === config.activeProfileId ? ' (active)' : ''}</option>`).join('');
    select.value = config.activeProfileId || prior || '';
    loadAzureProfile(select.value);
    byId('azure-configuration-status').textContent = config.profiles.length ? `${config.profiles.length} Azure resource${config.profiles.length === 1 ? '' : 's'} saved. ${config.hasApiKey ? 'The selected resource is ready.' : 'The selected resource needs a key.'}` : 'No Azure resources configured.';
  }
  function loadAzureProfile(id) { const config = window.AzureOpenAIProvider.getConfiguration(); const profile = config.profiles.find((item) => item.id === id); byId('azure-profile-name').value = profile ? profile.name : ''; byId('azure-openai-endpoint').value = profile ? profile.endpoint : ''; byId('azure-openai-deployment').value = profile ? profile.deployment : ''; byId('azure-openai-key').value = ''; if (profile && id !== config.activeProfileId) window.AzureOpenAIProvider.setActiveProfile(id).then(render); }
  function saveLocal() { return window.LocalServiceProvider.configure({ ollamaEndpoint: byId('ollama-endpoint').value, ollamaModel: byId('ollama-model').value, whisperEndpoint: byId('whisper-endpoint').value, whisperModel: byId('whisper-model').value }); }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  revealToggle('show-openai-key', 'openai-api-key'); revealToggle('show-azure-key', 'azure-openai-key'); revealToggle('show-gemini-key', 'gemini-api-key'); revealToggle('show-anthropic-key', 'anthropic-api-key');
  byId('azure-profile-select').addEventListener('change', (event) => loadAzureProfile(event.target.value));
  byId('remove-azure-profile').addEventListener('click', async () => { const id = byId('azure-profile-select').value; if (!id) { setStatus('Select a saved Azure resource to remove.'); return; } await window.AzureOpenAIProvider.removeProfile(id); setStatus('The selected Azure resource was removed.'); render(); });
  byId('save-anthropic-provider').addEventListener('click', async () => { try { await window.AnthropicProvider.configure({ apiKey: byId('anthropic-api-key').value, model: byId('anthropic-model').value }); byId('anthropic-api-key').value = ''; setStatus('Anthropic settings saved securely.'); render(); } catch (error) { setStatus(error.message); } });
  byId('test-anthropic-provider').addEventListener('click', async () => { setStatus('Testing Anthropic connection.'); try { const result = await window.AnthropicProvider.testConnection(); setStatus(`${result.message} No workflow was started.`); render(); } catch (error) { setStatus(error.message); } });
  byId('clear-anthropic-provider').addEventListener('click', async () => { await window.AnthropicProvider.clear(); byId('anthropic-api-key').value = ''; setStatus('Anthropic configuration cleared.'); render(); });
  byId('save-local-provider').addEventListener('click', async () => { await saveLocal(); setStatus('Local service settings saved.'); render(); });
  byId('test-ollama-provider').addEventListener('click', async () => { try { await saveLocal(); const result = await window.LocalServiceProvider.testOllama(); setStatus(result.message); render(); } catch (error) { setStatus(`Ollama was not detected. ${error.message}`); } });
  byId('test-whisper-provider').addEventListener('click', async () => { try { await saveLocal(); const result = await window.LocalServiceProvider.testWhisper(); setStatus(result.message); render(); } catch (error) { setStatus(`Local Whisper was not detected. ${error.message}`); } });
  byId('clear-local-provider').addEventListener('click', async () => { await window.LocalServiceProvider.clear(); setStatus('Local service settings cleared.'); render(); });
  document.addEventListener('provider-credentials-ready', render);
  document.addEventListener('shared-services-updated', render);
  document.addEventListener('DOMContentLoaded', render);
  window.ProviderManagerUI = { render };
})();
