(function () {
  const JOBS_KEY = 'media-workflow-assistant-jobs:v2';
  const BATCHES_KEY = 'media-workflow-assistant-batches:v1';
  const SCHEMA_KEY = 'media-workflow-assistant-production-schema';
  const SCHEMA_VERSION = 2;
  const TERMINAL = new Set(['completed', 'completed-with-warnings', 'failed', 'cancelled']);
  const RECOVERABLE = new Set(['queued', 'preparing', 'running', 'waiting-for-review', 'recovering', 'retrying', 'paused']);
  const transitions = {
    ready:['queued','cancelled'], queued:['preparing','paused','cancelled'], preparing:['running','paused','failed','cancelled'],
    running:['waiting-for-review','paused','retrying','completed','completed-with-warnings','failed','cancelled'],
    'waiting-for-review':['queued','paused','cancelled'], paused:['queued','recovering','cancelled'], recovering:['queued','running','paused','failed','cancelled'],
    retrying:['queued','running','failed','cancelled'], failed:['retrying','queued','cancelled'], completed:[], 'completed-with-warnings':[], cancelled:[]
  };
  let engine = null;
  let contextProvider = null;
  let announcer = null;
  const runtimeJobs = new Map();
  const listeners = new Set();

  function read(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value == null ? fallback : value; } catch (error) { return fallback; } }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); return value; }
  function now() { return new Date().toISOString(); }
  function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function safe(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function emit(message) { listeners.forEach((fn) => fn()); if (message && announcer) announcer(message); document.dispatchEvent(new CustomEvent('production-state-changed', { detail:{ message:message || '' } })); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function migrate() {
    const current = Number(localStorage.getItem(SCHEMA_KEY) || 0);
    if (current >= SCHEMA_VERSION) return;
    const jobs = read(JOBS_KEY, []);
    write(JOBS_KEY, Array.isArray(jobs) ? jobs.map(normalizeSnapshot) : []);
    if (!Array.isArray(read(BATCHES_KEY, []))) write(BATCHES_KEY, []);
    localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  }

  function normalizeSnapshot(item) {
    const value = item && typeof item === 'object' ? item : {};
    return Object.assign({ schemaVersion:SCHEMA_VERSION, id:uid('job'), projectId:'', workflowId:'', goal:'', status:'paused', progress:0,
      currentStepIndex:-1, completedSteps:[], pendingSteps:[], failedSteps:[], checkpoints:[], retry:{ count:0, max:3 },
      inputReferences:[], artifactReferences:[], messages:[], createdAt:now(), updatedAt:now(), completedAt:null, recoverable:false, requiresSource:false }, value);
  }

  function serialize(job) {
    const steps = (job.intent && job.intent.steps) || [];
    const completed = Array.isArray(job.completedSteps) ? job.completedSteps : steps.slice(0, Math.max(0, job.currentStepIndex));
    return normalizeSnapshot({
      id:job.id, projectId:job.projectId || '', batchId:job.batchId || '', workflowId:(job.workflow && job.workflow.id) || job.chainWorkflowId || '',
      goal:(job.intent && job.intent.title) || job.goal || '', workflowDefinition:{ id:(job.workflow && job.workflow.id) || '', title:(job.intent && job.intent.title) || '', steps:steps.slice() },
      status:job.status || 'ready', progress:Number(job.progress || 0), currentStepIndex:Number.isInteger(job.currentStepIndex) ? job.currentStepIndex : -1,
      completedSteps:completed.slice(), pendingSteps:steps.filter((step) => !completed.includes(step)), failedSteps:(job.failedSteps || []).slice(),
      humanReviewState:job.humanReviewState || null, inputReferences:[{ name:job.sourceFileName || '', type:job.inspection && job.inspection.sourceType || '', mediaType:job.inspection && job.inspection.mediaType || '' }],
      artifactReferences:(job.outputs || []).map((x) => ({ id:x.id, name:x.name, mimeType:x.mimeType })), progressMessage:(job.messages || []).slice(-1)[0] || '',
      errorDetails:job.errorDetails || null, retry:job.retry || { count:0, max:3 }, createdAt:toIso(job.createdAt || job.startedAt), updatedAt:now(),
      queuedAt:toIso(job.queuedAt), startedAt:toIso(job.startedAt), completedAt:toIso(job.completedAt), checkpoints:(job.checkpoints || []).slice(-40),
      recoverable:RECOVERABLE.has(job.status), requiresSource:!(job.sourceFile instanceof File), inspection:job.inspection || null
    });
  }
  function toIso(value) { if (!value) return null; try { return new Date(value).toISOString(); } catch (error) { return null; } }
  function listJobs() { return read(JOBS_KEY, []).map(normalizeSnapshot).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); }
  function getJob(id) { return listJobs().find((x) => x.id === id) || null; }
  function saveJob(job) {
    runtimeJobs.set(job.id, job);
    const jobs = listJobs(); const snapshot = serialize(job); const index = jobs.findIndex((x) => x.id === job.id);
    if (index >= 0) jobs[index] = snapshot; else jobs.push(snapshot); write(JOBS_KEY, jobs); return snapshot;
  }
  function patchJob(id, patch) { const jobs=listJobs(); const index=jobs.findIndex((x)=>x.id===id); if(index<0)return null; jobs[index]=normalizeSnapshot(Object.assign({},jobs[index],patch,{updatedAt:now()})); write(JOBS_KEY,jobs); emit(); return jobs[index]; }

  function transition(job, next, detail) {
    const current = job.status || 'ready';
    if (current !== next && !(transitions[current] || []).includes(next)) throw new Error(`Invalid job state transition from ${current} to ${next}.`);
    job.status = next; job.updatedAt = new Date();
    if (detail && detail.error) job.errorDetails = { message:detail.error.message || String(detail.error), at:now(), recoverable:Boolean(detail.recoverable) };
    saveJob(job); recordHistory(job, stateLabel(next), detail && detail.message); emit(`${job.intent ? job.intent.title : 'Job'} is ${stateLabel(next).toLowerCase()}.`); return job;
  }
  function stateLabel(state) { return String(state || '').replace(/-/g,' ').replace(/^./,(c)=>c.toUpperCase()); }

  function checkpoint(job, reason, extra) {
    job.checkpoints = Array.isArray(job.checkpoints) ? job.checkpoints : [];
    const point = { id:uid('checkpoint'), reason, at:now(), status:job.status, progress:job.progress || 0, currentStepIndex:job.currentStepIndex,
      completedSteps:(job.completedSteps || []).slice(), pendingSteps:(((job.intent||{}).steps)||[]).filter((s)=>!(job.completedSteps||[]).includes(s)),
      artifactReferences:(job.outputs||[]).map((x)=>({id:x.id,name:x.name,mimeType:x.mimeType})), extra:extra || null };
    job.checkpoints.push(point); saveJob(job); return point;
  }

  function recoverInterrupted() {
    const jobs = listJobs(); let count=0;
    jobs.forEach((item) => {
      if (['running','preparing','retrying','recovering'].includes(item.status)) {
        item.status='paused'; item.recoverable=true; item.requiresSource=true; item.errorDetails={ message:'Processing was interrupted before completion.', at:now(), recoverable:true };
        item.checkpoints=(item.checkpoints||[]).concat([{id:uid('checkpoint'),reason:'crash-recovery',at:now(),status:'paused',progress:item.progress,currentStepIndex:item.currentStepIndex,completedSteps:item.completedSteps||[],pendingSteps:item.pendingSteps||[]}]);
        item.updatedAt=now(); count += 1;
      }
    });
    write(JOBS_KEY,jobs); if(count) emit(`${count} interrupted job${count===1?' is':'s are'} available to recover.`); return count;
  }

  function resume(id) {
    const snapshot=getJob(id); if(!snapshot) throw new Error('That saved job is unavailable.');
    let job=runtimeJobs.get(id);
    if(!job && contextProvider) job=contextProvider(snapshot);
    if(!job) throw new Error('Choose the original source again before resuming this job.');
    job.currentStepIndex=snapshot.currentStepIndex; job.progress=snapshot.progress; job.completedSteps=(snapshot.completedSteps||[]).slice(); job.checkpoints=(snapshot.checkpoints||[]).slice(); job.retry=snapshot.retry||{count:0,max:3};
    if (job.status === 'failed') job.status='retrying'; else job.status='recovering'; checkpoint(job,'resume-requested'); engine.enqueue(job,{resume:true}); return job;
  }
  function pause(id) {
    const job=runtimeJobs.get(id); if(job && engine && engine.pause) return engine.pause(id);
    const item=getJob(id); if(!item || TERMINAL.has(item.status)) return false; patchJob(id,{status:'paused',recoverable:true}); emit(`${item.goal || 'Job'} paused.`); return true;
  }
  function retry(id) { const item=getJob(id); if(!item) return; if((item.retry||{}).count >= (item.retry||{}).max) throw new Error('This job reached its retry limit.'); patchJob(id,{status:'retrying',retry:{count:(item.retry.count||0)+1,max:item.retry.max||3}}); return resume(id); }

  function listBatches() { return read(BATCHES_KEY, []).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))); }
  function saveBatch(batch) { const batches=listBatches(); const index=batches.findIndex((x)=>x.id===batch.id); batch.updatedAt=now(); if(index>=0)batches[index]=batch; else batches.push(batch); write(BATCHES_KEY,batches); emit(); return batch; }
  function createBatch(name, jobs, concurrency) {
    const batch={id:uid('batch'),name:String(name||'').trim() || `Batch created ${new Date().toLocaleString()}`,status:'queued',progress:0,concurrency:Math.max(1,Math.min(3,Number(concurrency)||1)),jobIds:jobs.map((j)=>j.id),createdAt:now(),updatedAt:now(),completedAt:null};
    jobs.forEach((job)=>{job.batchId=batch.id;saveJob(job);}); saveBatch(batch); recordHistory(jobs[0], 'Batch created', batch.name); return batch;
  }
  function updateBatch(batchId) {
    const batch=listBatches().find((x)=>x.id===batchId); if(!batch)return null; const jobs=batch.jobIds.map(getJob).filter(Boolean);
    batch.progress=jobs.length?Math.round(jobs.reduce((t,j)=>t+Number(j.progress||0),0)/jobs.length):0;
    if(jobs.every((j)=>TERMINAL.has(j.status))) { batch.status=jobs.some((j)=>j.status==='failed')?'completed-with-warnings':'completed'; batch.completedAt=now(); }
    else if(jobs.some((j)=>j.status==='running')) batch.status='running'; else if(jobs.every((j)=>j.status==='paused')) batch.status='paused';
    return saveBatch(batch);
  }
  function pauseBatch(id) { const batch=listBatches().find((x)=>x.id===id); if(!batch)return; batch.jobIds.forEach((jobId)=>pause(jobId)); batch.status='paused'; saveBatch(batch); }
  function resumeBatch(id) { const batch=listBatches().find((x)=>x.id===id); if(!batch)return; batch.status='running'; saveBatch(batch); batch.jobIds.map(getJob).filter((j)=>!TERMINAL.has(j.status)).forEach((j)=>{try{resume(j.id);}catch(error){}}); }
  function cancelPendingBatch(id) { const batch=listBatches().find((x)=>x.id===id); if(!batch)return; batch.jobIds.map(getJob).filter((j)=>['queued','paused','recovering','retrying'].includes(j.status)).forEach((j)=>{ if(engine)engine.cancel(j.id); patchJob(j.id,{status:'cancelled',recoverable:false,completedAt:now()}); }); updateBatch(id); }
  function retryFailedBatch(id) { const batch=listBatches().find((x)=>x.id===id); if(!batch)return; batch.jobIds.map(getJob).filter((j)=>j.status==='failed').forEach((j)=>{try{retry(j.id);}catch(error){}}); }

  function recordHistory(job, event, detail) {
    const projectId=job && job.projectId; if(!projectId || !window.ProjectWorkspace) return;
    try { window.ProjectWorkspace.recordEvent(projectId,{jobId:job.id,sourceName:job.sourceFileName || '',workflowId:(job.workflow&&job.workflow.id)||'',event,detail:detail||'',timestamp:now()}); } catch(error) {}
  }

  function render() {
    const jobsEl=document.getElementById('production-jobs'); const batchesEl=document.getElementById('production-batches'); const historyEl=document.getElementById('project-history-list'); if(!jobsEl)return;
    const jobs=listJobs().slice(0,30);
    jobsEl.innerHTML=jobs.length?`<p><button type="button" id="create-batch-from-jobs">Create batch from selected jobs</button></p>${jobs.map((j)=>`<article class="job-card" data-job-id="${safe(j.id)}"><h3><label><input type="checkbox" data-batch-job value="${safe(j.id)}"> ${safe(j.goal||j.workflowId||'Workflow job')}</label></h3><p><strong>Status:</strong> ${safe(stateLabel(j.status))}. <strong>Progress:</strong> ${Number(j.progress||0)} percent.</p><p>${safe((j.inputReferences&&j.inputReferences[0]&&j.inputReferences[0].name)||'Source unavailable')}</p><div class="next-actions">${j.recoverable||j.status==='failed'?`<button type="button" data-job-action="resume">${j.status==='failed'?'Retry':'Resume'}</button>`:''}${!TERMINAL.has(j.status)?'<button type="button" data-job-action="pause">Pause</button>':''}</div></article>`).join('')}`:'<p>No saved jobs yet.</p>';
    const batches=listBatches(); batchesEl.innerHTML=batches.length?batches.map((b)=>`<article class="job-card" data-batch-id="${safe(b.id)}"><h3>${safe(b.name)}</h3><p><strong>Status:</strong> ${safe(stateLabel(b.status))}. <strong>Progress:</strong> ${b.progress} percent. ${b.jobIds.length} item${b.jobIds.length===1?'':'s'}.</p><div class="next-actions"><button type="button" data-batch-action="pause">Pause batch</button><button type="button" data-batch-action="resume">Resume batch</button><button type="button" data-batch-action="cancel">Cancel pending items</button><button type="button" data-batch-action="retry">Retry failed items</button></div></article>`).join(''):'<p>No batches yet.</p>';
    const project=window.ProjectWorkspace&&window.ProjectWorkspace.getActive(); const history=project&&Array.isArray(project.eventHistory)?project.eventHistory.slice().sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp))).slice(0,50):[];
    historyEl.innerHTML=history.length?`<ol>${history.map((h)=>`<li><time datetime="${safe(h.timestamp)}">${safe(new Date(h.timestamp).toLocaleString())}</time>: ${safe(h.event)}${h.sourceName?` for ${safe(h.sourceName)}`:''}${h.detail?`. ${safe(h.detail)}`:''}</li>`).join('')}</ol>`:'<p>No project history events yet.</p>';
  }

  function bindUi() {
    const section=document.getElementById('production-features-section'); if(!section)return;
    section.addEventListener('click',(event)=>{
      const button=event.target.closest('button'); if(!button)return;
      try {
        if (button.id === 'create-batch-from-jobs') {
          const selected = Array.from(section.querySelectorAll('[data-batch-job]:checked')).map((input) => runtimeJobs.get(input.value)).filter(Boolean);
          if (selected.length < 2) throw new Error('Select at least two jobs that are available in this browser session.');
          const workflowIds = new Set(selected.map((job) => job.workflow && job.workflow.id));
          if (workflowIds.size > 1) throw new Error('Selected jobs must use the same workflow to form a compatible batch.');
          const batch = createBatch('', selected, 1); selected.forEach((job) => { if (job.status === 'ready' || job.status === 'paused') engine.enqueue(job, { resume: job.status === 'paused' }); });
          emit(`${batch.name} created with ${selected.length} jobs.`); return;
        }
        const jobCard=button.closest('[data-job-id]'); const batchCard=button.closest('[data-batch-id]');
        if(jobCard){ const id=jobCard.dataset.jobId; if(button.dataset.jobAction==='resume'){const j=getJob(id); j.status==='failed'?retry(id):resume(id);} if(button.dataset.jobAction==='pause')pause(id); }
        if(batchCard){const id=batchCard.dataset.batchId; if(button.dataset.batchAction==='pause')pauseBatch(id); if(button.dataset.batchAction==='resume')resumeBatch(id); if(button.dataset.batchAction==='cancel')cancelPendingBatch(id); if(button.dataset.batchAction==='retry')retryFailedBatch(id);}
      } catch(error){ emit(error.message); }
    });
  }

  function init(options) { migrate(); engine=options.engine; contextProvider=options.contextProvider; announcer=options.announce; bindUi(); subscribe(render); recoverInterrupted(); render(); }
  window.ProductionFeatures={ init, subscribe, saveJob, getJob, listJobs, transition, checkpoint, recoverInterrupted, resume, pause, retry, createBatch, listBatches, updateBatch, pauseBatch, resumeBatch, cancelPendingBatch, retryFailedBatch, recordHistory, stateLabel };
})();
