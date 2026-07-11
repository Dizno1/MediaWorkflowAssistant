class PublicationReadiness {
 evaluate(project){
  const blockers=[];
  if(!project) blockers.push('No active project');
  return {
   ready:blockers.length===0,
   score:blockers.length?75:100,
   blockers,
   nextStep:blockers.length?'Resolve blockers':'Project is ready for publication'
  };
 }
}
window.PublicationReadiness=PublicationReadiness;
