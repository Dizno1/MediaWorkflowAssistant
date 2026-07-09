window.createJob=function(workflow,file){
return {
 id:Date.now().toString(),
 workflow,
 sourceFile:file?.name||"",
 progress:0,
 currentStep:0,
 status:"ready",
 outputs:[]
};}
