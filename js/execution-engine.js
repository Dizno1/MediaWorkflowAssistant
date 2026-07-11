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
      this.queue.push(job); this.onQueued(job,this.queue.length); this.processNext(); return job;
    }
    pause(jobId){
      const index=this.queue.findIndex((j)=>j.id===jobId);
      if(index>=0){const [job]=this.queue.splice(index,1); job.status='paused'; if(window.ProductionFeatures)window.ProductionFeatures.checkpoint(job,'job-paused'); return true;}
      if(this.activeJob&&this.activeJob.id===jobId){this.activeJob.pauseRequested=true; if(this.activeJob.abortController)this.activeJob.abortController.abort(); return true;} return false;
    }
    cancel(jobId){
      const index=this.queue.findIndex((j)=>j.id===jobId);
      if(index>=0){const [job]=this.queue.splice(index,1); job.status='cancelled'; job.completedAt=new Date(); if(window.ProductionFeatures){window.ProductionFeatures.checkpoint(job,'job-cancelled');window.ProductionFeatures.saveJob(job);} this.onCancel(job); return true;}
      if(this.activeJob&&this.activeJob.id===jobId){this.activeJob.cancelRequested=true;if(this.activeJob.abortController)this.activeJob.abortController.abort();return true;}return false;
    }
    async processNext(){
      if(this.processing||!this.queue.length)return; this.processing=true; const job=this.queue.shift(); this.activeJob=job;
      const runner=new window.WorkflowRunner({onUpdate:this.onUpdate,onComplete:(j)=>this.onComplete(j),onError:(j,e)=>{if(j.status==='cancelled')this.onCancel(j);else this.onError(j,e);}});
      await runner.run(job); if(job.batchId&&window.ProductionFeatures)window.ProductionFeatures.updateBatch(job.batchId); this.activeJob=null; this.processing=false; this.processNext();
    }
  }
  window.WorkflowExecutionEngine=WorkflowExecutionEngine;
})();
