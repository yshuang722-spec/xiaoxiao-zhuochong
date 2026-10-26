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
  if(e.getActionMasked()==MotionEvent.ACTION_DOWN)v.animate().scaleX(.97f).scaleY(.97f).setDuration(90).setInterpolator(new DecelerateInterpolator()).start();
  if(e.getActionMasked()==MotionEvent.ACTION_UP||e.getActionMasked()==MotionEvent.ACTION_CANCEL)v.animate().scaleX(1).scaleY(1).setDuration(180).setInterpolator(new OvershootInterpolator(.7f)).start();
  return false;
 });}
 static void enter(View view){if(!enabled())return;view.setAlpha(.3f);view.setTranslationY(Apple.dp(view.getContext(),6));view.animate().alpha(1).translationY(0).setDuration(180).setInterpolator(new DecelerateInterpolator(2)).start();}
}
