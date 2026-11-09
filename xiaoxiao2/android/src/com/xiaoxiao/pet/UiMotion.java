package com.xiaoxiao.pet;

import android.animation.ValueAnimator;
import android.view.*;
import android.view.animation.*;

/** Short feedback only; respects Android's system animation switch. */
final class UiMotion {
 static boolean enabled(){return ValueAnimator.areAnimatorsEnabled();}
 static void window(Window w){w.setWindowAnimations(enabled()?com.xiaoxiao.pet.mobile.R.style.PanelMotion:0);}
 static void press(View view){view.setOnTouchListener((v,e)->{
  if(!enabled())return false;
  // Pressing sinks the button onto its edge; releasing springs it back up.
  float sink=Apple.dp(v.getContext(),2);
  if(e.getActionMasked()==MotionEvent.ACTION_DOWN)v.animate().translationY(sink).scaleX(.97f).scaleY(.97f).setDuration(70).setInterpolator(new DecelerateInterpolator()).start();
  if(e.getActionMasked()==MotionEvent.ACTION_UP||e.getActionMasked()==MotionEvent.ACTION_CANCEL)v.animate().translationY(0).scaleX(1).scaleY(1).setDuration(320).setInterpolator(new OvershootInterpolator(2f)).start();
  return false;
 });}
 /** The one unprompted motion on the main screen: a card hops when its role is turned on. */
 static void hop(View v){if(!enabled())return;float d=Apple.dp(v.getContext(),12);v.animate().cancel();v.animate().translationY(-d).rotation(-1.5f).setDuration(170).setInterpolator(new DecelerateInterpolator()).withEndAction(()->v.animate().translationY(0).rotation(0).setDuration(420).setInterpolator(new OvershootInterpolator(2.2f)).start()).start();}
 /** Edit-order mode: cards wobble gently, like the desktop page and the iOS home screen. */
 static android.animation.Animator jiggle(View v,int index){if(!enabled())return null;android.animation.ObjectAnimator a=android.animation.ObjectAnimator.ofFloat(v,"rotation",-.5f,.5f);a.setDuration(300);a.setRepeatMode(ValueAnimator.REVERSE);a.setRepeatCount(ValueAnimator.INFINITE);a.setCurrentPlayTime((index*70L)%300);a.start();return a;}
 static void enter(View view){if(!enabled())return;view.animate().cancel();view.setAlpha(.25f);final float flip=view.getScaleX()<0?-1f:1f;view.setScaleX(.90f*flip);view.setScaleY(.90f);view.setTranslationY(Apple.dp(view.getContext(),16));view.animate().alpha(1).scaleX(flip).scaleY(1).translationY(0).setDuration(420).setInterpolator(new OvershootInterpolator(1.3f)).start();}
}
