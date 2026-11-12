/* 角色特性（数据驱动）：原来写死在 sprite.js / canvas-layout.js 里的“按角色判断”都改读这里。
   角色编号是全局唯一的 roleId（见 角色编号表）。角色自己的 config 里写 roleTraits 可覆盖/新增，
   没有写的按下面的内置表兜底，所以新角色不用改程序。 */
(function (root) {
  'use strict';
  const BASE = {handoff:'layered', clickSound:true, singingAudio:null, alternateIdle:false,
    playlistIdle:true, continuousIdle:false, idleLayout:null, actionAlign:null};
  const YUYU_ALIGN = {
    '吃蛋糕': {width:1112,height:834,scale:0.96076,left:0.02069,top:0.01946},
    '抱抱枕': {width:740,height:554,scale:1.02593,left:-0.01191,top:-0.00885},
    '墙角自闭': {width:740,height:554,scale:1.03708,left:-0.01649,top:-0.01440},
    '踢足球': {width:1112,height:834,scale:1.02230,left:-0.00973,top:-0.01005},
    '飞吻': {width:1112,height:834,scale:0.80030,left:0.10232,top:0.06009},
    '刀了你': {width:1112,height:834,scale:1.00795,left:-0.00249,top:-0.00287},
  };
  const TABLE = {
    main:        {playlistIdle:false},
    ojousama:    {continuousIdle:true},
    character3:  {continuousIdle:true},
    character4:  {idleLayout:{height:532, feet:632}},
    character9:  {singingAudio:'开心唱歌', actionAlign:YUYU_ALIGN},
    character13: {alternateIdle:true},
  };
  const cache = {};
  function resolve(roleId, own) {
    const key = roleId + (own ? JSON.stringify(own) : '');
    return cache[key] || (cache[key] = Object.freeze(Object.assign({}, BASE, TABLE[roleId] || {}, own || {})));
  }
  const api = {resolve, TABLE};
  root.PetRoleTraits = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
