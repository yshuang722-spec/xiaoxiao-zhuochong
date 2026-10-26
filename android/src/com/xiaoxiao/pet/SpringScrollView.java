package com.xiaoxiao.pet;

import android.content.Context;
import android.os.SystemClock;
import android.view.*;
import android.widget.ScrollView;

/** Native fling plus a bounded, damped edge spring; no layout changes per frame. */
final class SpringScrollView extends ScrollView {
 private float lastY,downX,downY,offset,velocity;
 private boolean pulling,touching,scheduled,bouncing;
 private long frameTime,flingUntil,lastImpact;
 private final int slop;
 SpringScrollView(Context c){super(c);slop=ViewConfiguration.get(c).getScaledTouchSlop();setOverScrollMode(OVER_SCROLL_NEVER);setSmoothScrollingEnabled(true);setVerticalFadingEdgeEnabled(false);}
 private View body(){return getChildCount()==0?null:getChildAt(0);}
 private int range(){View child=body();return child==null?0:Math.max(0,child.getHeight()-getHeight()+getPaddingTop()+getPaddingBottom());}
 private void shift(float value){offset=value;View child=body();if(child!=null)child.setTranslationY(value);}
 private void cancelSpring(){if(scheduled)Choreographer.getInstance().removeFrameCallback(spring);scheduled=false;bouncing=false;frameTime=0;velocity=0;}
 private void settle(){if(!UiMotion.enabled()){shift(0);return;}if(!bouncing){bouncing=true;Data.log("app","列表回弹开始 offset="+Math.round(offset));}if(!scheduled){scheduled=true;Choreographer.getInstance().postFrameCallback(spring);}}
 private final Choreographer.FrameCallback spring=new Choreographer.FrameCallback(){public void doFrame(long now){scheduled=false;if(touching||!isAttachedToWindow())return;if(!UiMotion.enabled()){shift(0);velocity=0;return;}float dt=frameTime==0?1f/60:Math.min(.032f,(now-frameTime)/1e9f);frameTime=now;
  // Substeps keep the same spring stable at both 60 Hz and 120 Hz.
  int steps=4;for(int i=0;i<steps;i++){float step=dt/steps;velocity+=(-260*offset-27*velocity)*step;offset+=velocity*step;}shift(offset);
  if(Math.abs(offset)<.35f&&Math.abs(velocity)<4){shift(0);velocity=0;frameTime=0;bouncing=false;Data.log("app","列表回弹结束 offset=0");}else settle();
 }};
 @Override public boolean dispatchTouchEvent(MotionEvent e){int action=e.getActionMasked();if(action==MotionEvent.ACTION_DOWN){cancelSpring();touching=true;pulling=false;lastY=downY=e.getY();downX=e.getX();flingUntil=0;}
  if(action==MotionEvent.ACTION_MOVE&&e.getPointerCount()==1&&body()!=null&&UiMotion.enabled()){
   float dy=e.getY()-lastY;boolean vertical=Math.abs(e.getY()-downY)>slop&&Math.abs(e.getY()-downY)>Math.abs(e.getX()-downX);boolean edge=getScrollY()<=0&&dy>0||getScrollY()>=range()&&dy<0;
   if(pulling||vertical&&edge){if(!pulling){MotionEvent cancel=MotionEvent.obtain(e);cancel.setAction(MotionEvent.ACTION_CANCEL);super.dispatchTouchEvent(cancel);cancel.recycle();pulling=true;getParent().requestDisallowInterceptTouchEvent(true);}
    float limit=Apple.dp(getContext(),56);float resistance=.32f*(1-Math.min(.85f,Math.abs(offset)/limit));shift(Math.max(-limit,Math.min(limit,offset+dy*resistance)));lastY=e.getY();return true;}
   lastY=e.getY();
  }
  if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_CANCEL){touching=false;if(pulling){pulling=false;getParent().requestDisallowInterceptTouchEvent(false);settle();return true;}flingUntil=action==MotionEvent.ACTION_UP?SystemClock.uptimeMillis()+1100:0;if(offset!=0)settle();}
  return super.dispatchTouchEvent(e);
 }
 @Override protected void onScrollChanged(int x,int y,int oldX,int oldY){super.onScrollChanged(x,y,oldX,oldY);long now=SystemClock.uptimeMillis();if(!touching&&now<flingUntil&&now-lastImpact>500&&UiMotion.enabled()&&y!=oldY&&(y==0||y>=range())){lastImpact=now;flingUntil=0;cancelSpring();velocity=Apple.dp(getContext(),y==0?210:-210);settle();}}
 @Override public void scrollTo(int x,int y){if(!touching){cancelSpring();shift(0);}super.scrollTo(x,y);}
 @Override protected void onDetachedFromWindow(){cancelSpring();shift(0);super.onDetachedFromWindow();}
}
