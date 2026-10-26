package com.xiaoxiao.pet;
import android.app.Dialog;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.view.*;
import java.lang.ref.WeakReference;
import java.util.*;
import java.util.function.Consumer;
/** System backdrop blur only; foreground labels, videos and controls stay sharp. */
final class FrostedPanel {
 static final WeakHashMap<Dialog,Binding> bindings=new WeakHashMap<>();
 static WeakReference<MainActivity> main=new WeakReference<>(null);
 static Consumer<Boolean> mainListener;
 static android.graphics.drawable.ColorDrawable mainBackground;
 static boolean enabled(){return Data.prefs().getBoolean("appearance.glass",true);}
 static boolean available(){return enabled()&&Build.VERSION.SDK_INT>=31&&Data.app.getSystemService(WindowManager.class).isCrossWindowBlurEnabled();}
 static int tint(int color,int alpha){return (color&0xffffff)|(alpha<<24);}
 static void attachMain(MainActivity a){main=new WeakReference<>(a);mainBackground=null;if(Build.VERSION.SDK_INT>=31){mainListener=on->refresh();a.getSystemService(WindowManager.class).addCrossWindowBlurEnabledListener(a.getMainExecutor(),mainListener);}refresh();}
 static void releaseMain(MainActivity a){if(main.get()==a){if(Build.VERSION.SDK_INT>=31&&mainListener!=null)a.getSystemService(WindowManager.class).removeCrossWindowBlurEnabledListener(mainListener);mainListener=null;main.clear();}}
 static void attach(Dialog d){if(!bindings.containsKey(d))bindings.put(d,new Binding(d));bindings.get(d).update();}
 static void configure(Dialog d,int radius,boolean full){attach(d);Binding b=bindings.get(d);b.radius=radius;b.full=full;b.update();}
 static void refresh(){Apple.refreshMaterials();MainActivity a=main.get();if(a!=null&&!a.isDestroyed()){
   Window w=a.getWindow();boolean glass=available();WindowManager.LayoutParams p=new WindowManager.LayoutParams();p.copyFrom(w.getAttributes());
   if(Build.VERSION.SDK_INT>=31)p.setBlurBehindRadius(glass?Apple.dp(a,40):0);
   if(glass)p.flags|=WindowManager.LayoutParams.FLAG_BLUR_BEHIND|WindowManager.LayoutParams.FLAG_SHOW_WALLPAPER;else p.flags&=~(WindowManager.LayoutParams.FLAG_BLUR_BEHIND|WindowManager.LayoutParams.FLAG_SHOW_WALLPAPER);
   WindowManager.LayoutParams old=w.getAttributes();if(old.flags!=p.flags||Build.VERSION.SDK_INT>=31&&old.getBlurBehindRadius()!=p.getBlurBehindRadius())w.setAttributes(p);
   int color=glass?tint(Apple.BACK,Apple.dark?156:132):Apple.BACK;if(mainBackground==null){mainBackground=new android.graphics.drawable.ColorDrawable(color);w.setBackgroundDrawable(mainBackground);}else if(mainBackground.getColor()!=color)mainBackground.setColor(color);
  }for(Binding b:new ArrayList<>(bindings.values()))b.update();}
 static final class Binding {
  final WeakReference<Dialog> dialog;final WindowManager manager;Consumer<Boolean> listener;int radius=24;boolean full;
  Binding(Dialog d){dialog=new WeakReference<>(d);manager=d.getContext().getSystemService(WindowManager.class);
   d.getWindow().getDecorView().addOnAttachStateChangeListener(new View.OnAttachStateChangeListener(){public void onViewAttachedToWindow(View v){}public void onViewDetachedFromWindow(View v){release();}});
   if(Build.VERSION.SDK_INT>=31){listener=on->refresh();manager.addCrossWindowBlurEnabledListener(d.getContext().getMainExecutor(),listener);}
  }
  void update(){Dialog d=dialog.get();if(d==null||!d.isShowing())return;boolean glass=available();Window w=d.getWindow();
   if(Build.VERSION.SDK_INT>=31){w.setBackgroundBlurRadius(glass&&!full?Apple.dp(d.getContext(),36):0);WindowManager.LayoutParams p=w.getAttributes();p.setBlurBehindRadius(glass&&full?Apple.dp(d.getContext(),36):0);if(glass&&full)p.flags|=WindowManager.LayoutParams.FLAG_BLUR_BEHIND;else p.flags&=~WindowManager.LayoutParams.FLAG_BLUR_BEHIND;w.setAttributes(p);}
   GlassSurface bg=new GlassSurface(d.getContext(),radius);bg.setColor(glass?tint(Apple.PANEL,Apple.dark?160:142):Apple.PANEL);bg.glass(glass);
   w.setBackgroundDrawable(bg);w.setDimAmount(full?0:glass?.10f:.25f);
  }
  void release(){if(Build.VERSION.SDK_INT>=31&&listener!=null){manager.removeCrossWindowBlurEnabledListener(listener);listener=null;}Dialog d=dialog.get();if(d!=null)bindings.remove(d);}
 }
}
