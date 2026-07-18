(function () {
  class WorkflowExecutionEngine {
    constructor(options = {}) {
      this.queue=[]; this.activeJob=null; this.processing=false; this.pausedIds=new Set();
      this.onQueued=options.onQueued||function(){}; this.onUpdate=options.onUpdate||function(){}; this.onComplete=options.onComplete||function(){}; this.onError=options.onError||function(){}; this.onCancel=options.onCancel||function(){};
    }
    enqueue(job, options={}) {
      if(!job)throw new Error('A workflow job is required.');
      if(this.activeJob&&this.activeJob.id===job.id || this.queue.some((x)=>x.id===job.id)) return job;
      job.queuedAt=new Date();
      if(window.ProductionFeatures){
        if(['recovering','retrying','paused','waiting-for-review'].includes(job.status)) job.status='queued';
        else window.ProductionFeatures.transition(job,'queued',{message:options.resume?'Job queued to resume.':'Job queued.'});
        window.ProductionFeatures.checkpoint(job,options.resume?'resume-queued':'job-queued');
      } else job.status='queued';
      this.queue.push(job);
      console.log(`[job-queue] queued ${job.intent && job.intent.workflowId} (queue length ${this.queue.length})`);
      this.onQueued(job,this.queue.length);
      // Deferred, not called synchronously: enqueue() is very often called from *inside* another
      // job's own onComplete callback (workflow-chain continuation calls runIntent() -> enqueue()
      // directly), which is itself still on the call stack of processNext()'s
      // `await runner.run(job)` for that other job. `this.processing` has not been reset yet at
      // that point in the stack, so calling processNext() synchronously here would always no-op
      // against stale state. Deferring to a fresh microtask means it always runs after the current
      // job's processNext() call has had a chance to actually finish resetting that state.
      Promise.resolve().then(() => this.processNext());
      return job;
    }
    pause(jobId){
      const index=this.queue.findIndex((j)=>j.id===jobId);
      if(index>=0){const [job]=this.queue.splice(index,1); job.status='paused'; if(window.ProductionFeatures)window.ProductionFeatures.checkpoint(job,'job-paused'); return true;}
      if(this.activeJob&&this.activeJob.id===jobId){this.activeJob.pauseRequested=true; if(this.activeJob.abortController)this.activeJob.abortController.abort(); return true;} return false;
    }
    cancel(jobId){
      const index=this.queue.findIndex((j)=>j.id===jobId);
      if(index>=0){const [job]=this.queue.splice(index,1); job.status='cancelled'; job.completedAt=new Date(); console.log(`[job-queue] removed cancelled job ${job.intent && job.intent.workflowId} from queue (queue length ${this.queue.length})`); if(window.ProductionFeatures){window.ProductionFeatures.checkpoint(job,'job-cancelled');window.ProductionFeatures.saveJob(job);} this.onCancel(job); return true;}
      if(this.activeJob&&this.activeJob.id===jobId){this.activeJob.cancelRequested=true;if(this.activeJob.abortController)this.activeJob.abortController.abort();return true;}return false;
    }
    async processNext(){
      if(this.processing||!this.queue.length)return;
      this.processing=true;
      const job=this.queue.shift();
      this.activeJob=job;
      console.log(`[job-queue] worker picked up ${job.intent && job.intent.workflowId} (queue length now ${this.queue.length})`);
      try {
        const runner=new window.WorkflowRunner({onUpdate:this.onUpdate,onComplete:(j)=>{console.log(`[job-queue] completed ${j.intent && j.intent.workflowId}`);this.onComplete(j);},onError:(j,e)=>{console.log(`[job-queue] ${j.status==='cancelled'?'cancelled':'failed'} ${j.intent && j.intent.workflowId}: ${e && e.message}`);if(j.status==='cancelled')this.onCancel(j);else this.onError(j,e);}});
        await runner.run(job);
        if(job.batchId&&window.ProductionFeatures)window.ProductionFeatures.updateBatch(job.batchId);
      } catch (error) {
        // Unreachable in normal operation — WorkflowRunner.run() is designed to always resolve,
        // never reject, catching every error internally and reporting it through onError. This
        // exists purely as a last-resort guarantee: if something the engine doesn't control ever
        // does throw here, the job is reported as failed and the engine keeps working, rather than
        // this.processing staying true forever and silently jamming every job queued after it —
        // which is the exact symptom a stuck "queued at position 2" render job would produce.
        console.error('[job-queue] an error escaped WorkflowRunner.run() — this should not happen:', error);
        try { this.onError(job, error instanceof Error ? error : new Error('An unexpected error stopped this workflow.')); } catch (reportingError) { console.error('[job-queue] error while reporting the above failure:', reportingError); }
      } finally {
        this.activeJob=null;
        this.processing=false;
      }
      this.processNext();
    }
  }
  window.WorkflowExecutionEngine=WorkflowExecutionEngine;
})();
