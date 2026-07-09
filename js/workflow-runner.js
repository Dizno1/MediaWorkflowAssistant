class WorkflowRunner {
  async run(job, steps, onUpdate){
    for(let i=0;i<steps.length;i++){
      job.currentStep=i+1;
      job.progress=Math.round(((i+1)/steps.length)*100);
      if(onUpdate) onUpdate(job, steps[i]);
      await new Promise(r=>setTimeout(r,300));
    }
    job.status='completed';
    return job;
  }
}
window.WorkflowRunner=WorkflowRunner;
