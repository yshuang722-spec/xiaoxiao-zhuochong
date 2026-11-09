/* Reference-canvas display calibration. Does not resize the pet's physics stage. */
(function (root) {
  'use strict';
  const reference = Object.freeze({ width:1280, height:960, subjectLeft:405, subjectRight:880, subjectTop:268, subjectBottom:851, subjectHeight:583 });
  const previousReference = Object.freeze({ width:1280, height:1000, subjectLeft:405, subjectRight:875, subjectTop:298, subjectBottom:879, subjectHeight:582 });
  function layout(width, height, petSize, assetRoot, traits) {
    if (![width,height,petSize].every(n=>Number.isFinite(n)&&n>0)) return null;
    // Exact 1280x960 and integer multiples only: legacy 960x720 must keep its layout.
    const isNew = width>=1280 && width%1280===0 && height===width*3/4;
    const ref = isNew ? reference : previousReference;
    if (!isNew && Math.abs(width/height-previousReference.width/previousReference.height)>0.002) return null;
    // White dragon calibration measured from its actual idle first frame (1280x720).
    const idle = isNew && traits && traits.idleLayout ? traits.idleLayout : {height:535,feet:634};
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
  // First-frame alignment for Yuyu's six new clips; source videos remain untouched.
  const yuyuActions = Object.freeze({
    '吃蛋糕': {width:1112,height:834,scale:0.96076,left:0.02069,top:0.01946},
    '抱抱枕': {width:740,height:554,scale:1.02593,left:-0.01191,top:-0.00885},
    '墙角自闭': {width:740,height:554,scale:1.03708,left:-0.01649,top:-0.01440},
    '踢足球': {width:1112,height:834,scale:1.02230,left:-0.00973,top:-0.01005},
    '飞吻': {width:1112,height:834,scale:0.80030,left:0.10232,top:0.06009},
    '刀了你': {width:1112,height:834,scale:1.00795,left:-0.00249,top:-0.00287},
  });
  function apply(video, petSize, assetRoot, animationName, traits) {
    const profile = traits && traits.actionAlign ? traits.actionAlign[animationName] : null;
    const calibrated = profile && video.videoWidth === profile.width && video.videoHeight === profile.height;
    const box = calibrated ? {
      profile:'首帧对齐', scale:profile.scale,
      width:petSize*profile.scale, height:petSize*9/16*profile.scale,
      left:petSize*profile.left, top:petSize*profile.top,
      footOrigin:'50% 100%',
    } : layout(video.videoWidth,video.videoHeight,petSize,assetRoot,traits);
    for(const key of ['left','top','width','height']) video.style[key]=box?box[key]+'px':'';
    if(video.dataset){if(box)video.dataset.canvasFootOrigin=box.footOrigin;else delete video.dataset.canvasFootOrigin;}
    return box;
  }
  const api={reference,layout,apply};root.PetCanvasLayout=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
