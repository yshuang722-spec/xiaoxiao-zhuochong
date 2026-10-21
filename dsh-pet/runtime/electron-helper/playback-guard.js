/* Recover a failed clip without restarting another character or its window. */
(function(root){
  'use strict';
  function watch(video, options){
    const now=options.now||Date.now;
    const every=options.every||((fn)=>root.setInterval(fn,1000));
    const cancel=options.cancel||((id)=>root.clearInterval(id));
    let previous=video.currentTime,advanced=now(),stopped=false,timer;
    function stop(){if(stopped)return;stopped=true;cancel(timer);video.removeEventListener('error',check);}
    function check(){
      if(stopped)return;
      if(!options.isCurrent()){stop();return;}
      if(options.isBlocked()){advanced=now();return;}
      if(video.error){const code=video.error.code;stop();options.onFailure('media error '+code);return;}
      if(video.ended&&options.isOnce()){stop();options.onEnded();return;}
      if(Math.abs(video.currentTime-previous)>0.015){previous=video.currentTime;advanced=now();return;}
      if(now()-advanced>=6000){stop();options.onFailure('playback stopped advancing');}
    }
    timer=every(check);video.addEventListener('error',check);
    return {stop,check};
  }
  root.PetPlaybackGuard={watch};
  if(typeof module!=='undefined'&&module.exports)module.exports={watch};
})(typeof window!=='undefined'?window:globalThis);
