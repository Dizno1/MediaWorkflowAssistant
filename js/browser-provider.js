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
  const artifacts=[{name:job.sourceFileName.replace(/\.[^.]+$/,'')+'-AI-Package.md',url:url,type:'Markdown'}];
  return artifacts;
 }
}
BrowserProvider.prototype.downloadArtifact=function(artifact){const a=document.createElement('a');a.href=artifact.url;a.download=artifact.name;document.body.appendChild(a);a.click();a.remove();};
window.BrowserProvider=BrowserProvider;
})();