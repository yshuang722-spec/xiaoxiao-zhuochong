/* Reference-canvas display calibration. Does not resize the pet's physics stage. */
(function (root) {
  'use strict';
  const reference = Object.freeze({ width:1280, height:960, subjectLeft:405, subjectRight:880, subjectTop:268, subjectBottom:851, subjectHeight:583 });
  const previousReference = Object.freeze({ width:1280, height:1000, subjectLeft:405, subjectRight:875, subjectTop:298, subjectBottom:879, subjectHeight:582 });
  function layout(width, height, petSize, assetRoot) {
    if (![width,height,petSize].every(n=>Number.isFinite(n)&&n>0)) return null;
    // Exact 1280x960 and integer multiples only: legacy 960x720 must keep its layout.
    const isNew = width>=1280 && width%1280===0 && height===width*3/4;
    const ref = isNew ? reference : previousReference;
    if (!isNew && Math.abs(width/height-previousReference.width/previousReference.height)>0.002) return null;
    // White dragon calibration measured from its actual idle first frame (1280x720).
    const idle = isNew && assetRoot==='character4' ? {height:532,feet:632} : {height:535,feet:634};
    const subjectHeight = petSize*idle.height/1280;
    const scale = subjectHeight/ref.subjectHeight;
    return {
      profile:isNew?'参考画幅1280x960':'参考画幅1280x1000',
      width:ref.width*scale,
      height:ref.height*scale,
      left:petSize/2-(ref.subjectLeft+ref.subjectRight)/2*scale,
      top:petSize*idle.feet/1280-ref.subjectBottom*scale,
      scale,
      footOrigin:`${(ref.subjectLeft+ref.subjectRight)/2/ref.width*100}% ${ref.subjectBottom/ref.height*100}%`,
    };
  }
  function apply(video, petSize, assetRoot) {
    const box=layout(video.videoWidth,video.videoHeight,petSize,assetRoot);
    for(const key of ['left','top','width','height']) video.style[key]=box?box[key]+'px':'';
    if(video.dataset){if(box)video.dataset.canvasFootOrigin=box.footOrigin;else delete video.dataset.canvasFootOrigin;}
    return box;
  }
  const api={reference,layout,apply};root.PetCanvasLayout=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
