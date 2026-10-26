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
  if(e.getActionMasked()==MotionEvent.ACTION_DOWN)v.animate().scaleX(.92f).scaleY(.92f).setDuration(90).setInterpolator(new DecelerateInterpolator()).start();
  if(e.getActionMasked()==MotionEvent.ACTION_UP||e.getActionMasked()==MotionEvent.ACTION_CANCEL)v.animate().scaleX(1).scaleY(1).setDuration(380).setInterpolator(new OvershootInterpolator(1.7f)).start();
  return false;
 });}
 static void enter(View view){if(!enabled())return;view.animate().cancel();view.setAlpha(.25f);view.setScaleX(.90f);view.setScaleY(.90f);view.setTranslationY(Apple.dp(view.getContext(),16));view.animate().alpha(1).scaleX(1).scaleY(1).translationY(0).setDuration(420).setInterpolator(new OvershootInterpolator(1.3f)).start();}
}
