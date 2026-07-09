(function(){
class BrowserProvider{
 initialize(){return true;}
 canRun(job){return job.workflow.id==='prepare-for-ai';}
 async execute(job){
  const md=[
'# AI Preparation Package',
'',
'## Source',
`- File: ${job.sourceFileName}`,
`- Workflow: ${job.workflow.name}`,
'',
'## Inspection Summary',
job.inspection.recommendedSummary,
'',
'## Suggested Prompts',
'- Summarize this media.',
'- Identify action items.',
'- Produce an accessible overview.'
  ].join('\n');
  const blob=new Blob([md],{type:'text/markdown'});
  const url=URL.createObjectURL(blob);
  return [{name:job.sourceFileName.replace(/\.[^.]+$/,'')+'-AI-Package.md',url:url,type:'Markdown'}];
 }
}
window.BrowserProvider=BrowserProvider;
})();