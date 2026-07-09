(function(){
const providers=[
{id:'browser',name:'Browser Provider',workflows:['prepare-for-ai'],available:true},
{id:'ffmpeg',name:'FFmpeg Provider',workflows:['extract-audio','compress-video','compress-audio'],available:false,reason:'Desktop provider not connected yet'},
{id:'whisper',name:'Whisper Provider',workflows:['create-transcript','create-captions'],available:false,reason:'Speech provider not connected yet'}
];
function getProvider(workflowId){
 return providers.find(p=>p.workflows.includes(workflowId))||null;
}
window.ProviderManager={providers,getProvider};
})();