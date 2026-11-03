package com.xiaoxiao.pet;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.*;
import android.graphics.drawable.*;
import android.view.Gravity;
import android.view.View;
import android.widget.*;

/** Sticker-book pieces shared by the phone screens, mirroring the desktop control page:
 *  white faces on a solid offset edge, so cards look stuck on and buttons look pressable. */
final class Sticker {
 static int dp(Context c,int v){return Apple.dp(c,v);}
 static int mix(int a,int b,float t){return Color.rgb(Math.round(Color.red(a)*(1-t)+Color.red(b)*t),Math.round(Color.green(a)*(1-t)+Color.green(b)*t),Math.round(Color.blue(a)*(1-t)+Color.blue(b)*t));}
 static int edge(){return Apple.dark?0xff140e19:0xffead6d9;}
 static Typeface medium(){return Typeface.create("sans-serif-medium",Typeface.NORMAL);}

 static Drawable lifted(Context c,int face,int edge,int radius,int lift,boolean stroke){
  GradientDrawable e=new GradientDrawable();e.setCornerRadius(dp(c,radius));e.setColor(edge);
  GradientDrawable f=new GradientDrawable();f.setCornerRadius(dp(c,radius));f.setColor(face);if(stroke)f.setStroke(Math.max(1,dp(c,1)),Apple.LINE);
  LayerDrawable l=new LayerDrawable(new Drawable[]{e,f});int d=dp(c,lift);l.setLayerInset(0,0,d,0,0);l.setLayerInset(1,0,0,0,d);return l;
 }
 static Drawable panel(Context c,int radius){return lifted(c,Apple.PANEL,edge(),radius,5,true);}
 static Drawable sticker(Context c,int tint,int radius){return lifted(c,Apple.PANEL,Apple.dark?mix(tint,0xff140e19,.45f):mix(tint,Color.WHITE,.55f),radius,6,true);}
 static Drawable frame(Context c,int radius){return lifted(c,Apple.dark?Apple.PANEL:Color.WHITE,edge(),radius,3,true);}
 /** Frame for the Artemis logo: white by day, the logo's own deep navy at night so it doesn't glare. */
 static Drawable logoFrame(Context c,int radius){return lifted(c,Apple.dark?0xff16113e:Color.WHITE,Apple.dark?0xff0b0820:edge(),radius,3,true);}
 static Drawable toast(Context c){return lifted(c,Apple.dark?0xfff7eaf2:0xff3d2b3f,Apple.dark?0xffa893ad:0xff22162a,18,4,false);}

 /** Portrait stage: role-tinted dotted paper with a soft ground shadow under the feet. */
 static final class Stage extends Drawable {
  final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);final int tint;final float r,gap,dot,shadowH;
  Stage(Context c,int t){tint=t;r=dp(c,20);gap=dp(c,16);dot=Math.max(1.5f,c.getResources().getDisplayMetrics().density*1.5f);shadowH=dp(c,7);}
  public void draw(Canvas c){Rect b=getBounds();RectF f=new RectF(b);c.save();Path clip=new Path();clip.addRoundRect(f,r,r,Path.Direction.CW);c.clipPath(clip);
   p.setShader(null);p.setColor(Apple.dark?mix(tint,Apple.PANEL,.80f):mix(tint,Color.WHITE,.86f));c.drawRect(f,p);
   p.setColor(Apple.dark?mix(tint,Apple.PANEL,.68f):mix(tint,Color.WHITE,.76f));
   for(float y=gap/2;y<b.height();y+=gap)for(float x=gap/2;x<b.width();x+=gap)c.drawCircle(b.left+x,b.top+y,dot,p);
   float cx=b.exactCenterX(),cy=b.bottom-b.height()*.09f,w=b.width()*.24f;
   p.setShader(new RadialGradient(cx,cy,w,(tint&0xffffff)|0x60000000,tint&0xffffff,Shader.TileMode.CLAMP));
   c.save();c.scale(1,shadowH/w,cx,cy);c.drawCircle(cx,cy,w,p);c.restore();p.setShader(null);c.restore();}
  public void setAlpha(int a){p.setAlpha(a);}public void setColorFilter(ColorFilter f){p.setColorFilter(f);}public int getOpacity(){return PixelFormat.TRANSLUCENT;}
 }
 static Drawable stage(Context c,int tint){return new Stage(c,tint);}

 static TextView chip(Context c,String text,boolean on){
  TextView t=new TextView(c);t.setText(text);t.setTextSize(12);t.setTypeface(medium());t.setIncludeFontPadding(false);t.setTextColor(on?Apple.SUCCESS:Apple.SECONDARY);
  t.setPadding(dp(c,10),dp(c,6),dp(c,11),dp(c,6));GradientDrawable g=new GradientDrawable();g.setCornerRadius(dp(c,99));
  g.setColor(on?Apple.SUCCESS_BACK:(Apple.dark?0xe61f1825:0xf2ffffff));if(!on)g.setStroke(Math.max(1,dp(c,1)),Apple.LINE);t.setBackground(g);
  if(on){GradientDrawable d=new GradientDrawable();d.setShape(GradientDrawable.OVAL);d.setColor(Apple.MINT);d.setSize(dp(c,7),dp(c,7));t.setCompoundDrawablesWithIntrinsicBounds(d,null,null,null);t.setCompoundDrawablePadding(dp(c,6));}
  return t;
 }
 /** Dashed cut line, like the desktop card and settings separators. */
 static View dashed(Context c){
  final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(dp(c,2));p.setPathEffect(new DashPathEffect(new float[]{dp(c,6),dp(c,5)},0));
  View v=new View(c){protected void onDraw(Canvas canvas){p.setColor(Apple.LINE);float y=getHeight()/2f;canvas.drawLine(0,y,getWidth(),y,p);}};
  v.setLayerType(View.LAYER_TYPE_SOFTWARE,null);return v;
 }
 private static void base(Button b,int size){b.setAllCaps(false);b.setTextSize(size);b.setTypeface(medium());b.setMinWidth(0);b.setMinimumWidth(0);b.setMinHeight(0);b.setMinimumHeight(0);b.setStateListAnimator(null);b.setElevation(0);b.setLetterSpacing(0);}
 static LinearLayout segmented(Context c){LinearLayout l=new LinearLayout(c);l.setPadding(dp(c,4),dp(c,4),dp(c,4),dp(c,4));GradientDrawable g=new GradientDrawable();g.setCornerRadius(dp(c,16));g.setColor(Apple.dark?0xff1a131f:0xfff7e6e6);l.setBackground(g);return l;}
 static void segment(Button b,boolean selected){Context c=b.getContext();base(b,13);b.setPadding(dp(c,14),0,dp(c,14),selected?dp(c,2):0);b.setTextColor(selected?Apple.BLUE:Apple.SECONDARY);
  // Unselected segments light up as a raised white tile while pressed (desktop: white on hover, shrink on press), no grey ripple.
  if(selected)b.setBackground(lifted(c,Apple.PANEL,edge(),12,2,false));
  else{StateListDrawable s=new StateListDrawable();s.setEnterFadeDuration(60);s.setExitFadeDuration(220);s.addState(new int[]{android.R.attr.state_pressed},lifted(c,Apple.dark?0xff4a3e55:Color.WHITE,edge(),12,2,false));s.addState(new int[]{},new ColorDrawable(Color.TRANSPARENT));b.setBackground(s);}
  UiMotion.press(b);}
 static void pill(Button b,boolean active){Context c=b.getContext();base(b,13);b.setPadding(dp(c,16),0,dp(c,16),dp(c,3));b.setTextColor(active?Color.WHITE:Apple.INK);
  b.setBackground(active?lifted(c,Apple.dark?Apple.PRIMARY:0xff3d2b3f,Apple.dark?Apple.PRIMARY_EDGE:0xff22162a,99,3,false):lifted(c,Apple.PANEL,edge(),99,3,true));UiMotion.press(b);}
 static void chipButton(Button b){Context c=b.getContext();base(b,13);b.setPadding(dp(c,14),0,dp(c,14),dp(c,2));b.setTextColor(Apple.dark?0xffffc6a6:0xff8b5a44);
  b.setBackground(lifted(c,Apple.dark?0xff3a2c42:0xfffff6f2,Apple.dark?0xff2a1f31:0xfff3dcd3,12,2,false));UiMotion.press(b);}
 /** Desktop-style switch: thick track, white knob sitting on a solid edge; mint when on. */
 static void styleSwitch(Switch s){Context c=s.getContext();int[] on={android.R.attr.state_checked};
  StateListDrawable track=new StateListDrawable();track.addState(on,pillShape(c,Apple.MINT,52,32));track.addState(new int[]{},pillShape(c,Apple.dark?0xff3d3047:0xffecdcdd,52,32));
  StateListDrawable thumb=new StateListDrawable();thumb.addState(on,knob(c,0xff25a678));thumb.addState(new int[]{},knob(c,Apple.dark?0xff140e19:0xffd3bcbe));
  s.setThumbTintList(null);s.setTrackTintList(null);s.setTrackDrawable(track);s.setThumbDrawable(thumb);s.setShowText(false);s.setSwitchMinWidth(dp(c,52));}
 private static GradientDrawable pillShape(Context c,int color,int w,int h){GradientDrawable g=new GradientDrawable();g.setCornerRadius(dp(c,99));g.setColor(color);g.setSize(dp(c,w),dp(c,h));return g;}
 private static Drawable knob(Context c,int edge){GradientDrawable e=new GradientDrawable();e.setShape(GradientDrawable.OVAL);e.setColor(edge);GradientDrawable f=new GradientDrawable();f.setShape(GradientDrawable.OVAL);f.setColor(Color.WHITE);
  LayerDrawable l=new LayerDrawable(new Drawable[]{e,f});int d=dp(c,3),lift=dp(c,3);l.setLayerInset(0,d,d+lift,d,d);l.setLayerInset(1,d,d,d,d+lift);l.setLayerSize(0,dp(c,32),dp(c,32));l.setLayerSize(1,dp(c,32),dp(c,32));
  return new InsetDrawable(l,0);}
 // Role colour (average of the portrait's colourful pixels) and the sharp card art, shared by every screen.
 static final java.util.HashMap<String,Integer> roleColors=new java.util.HashMap<>();
 static int roleColor(Context c,String role){Integer cached=roleColors.get(role);if(cached!=null)return cached;int color=Apple.PRIMARY;
  try{Bitmap s=Bitmap.createScaledBitmap(BitmapFactory.decodeStream(c.getAssets().open(Data.role(role).optString("portrait"))),48,36,true);long r=0,g=0,b=0,n=0;
   for(int y=0;y<s.getHeight();y++)for(int x=0;x<s.getWidth();x++){int p=s.getPixel(x,y);if(Color.alpha(p)<200)continue;int R=Color.red(p),G=Color.green(p),B=Color.blue(p),mx=Math.max(R,Math.max(G,B)),mn=Math.min(R,Math.min(G,B));if(mx-mn<60||mx<70)continue;r+=R;g+=G;b+=B;n++;}
   if(n>0)color=Color.rgb((int)(r/n),(int)(g/n),(int)(b/n));}catch(Exception e){}
  roleColors.put(role,color);return color;}
 static Bitmap cardArt(Context c,String role){try{return BitmapFactory.decodeStream(c.getAssets().open(role+"/card.png"));}catch(Exception e){return null;}}
 static int tintEdge(int tint){return Apple.dark?mix(tint,0xff140e19,.45f):mix(tint,Color.WHITE,.55f);}
 /** Thick menu tile tinted with the role colour; the hide tile is red. */
 static void tile(Button b,int tint,boolean danger){Context c=b.getContext();base(b,14);b.setGravity(Gravity.CENTER);b.setTextColor(danger?Apple.DANGER:Apple.INK);
  int face=danger?(Apple.dark?0xff4a2026:0xfffff0f0):(Apple.dark?mix(tint,Apple.PANEL,.80f):mix(tint,Color.WHITE,.88f)),edge=danger?(Apple.dark?0xff2a1216:0xfff6caca):tintEdge(tint);
  b.setBackground(lifted(c,face,edge,16,3,false));UiMotion.press(b);}
 /** Full-width action row; the selected one takes the role colour. */
 static void row(Button b,int tint,boolean selected){Context c=b.getContext();base(b,15);b.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);b.setTextColor(Apple.INK);b.setPadding(dp(c,16),0,dp(c,14),dp(c,3));
  int face=selected?(Apple.dark?mix(tint,Apple.PANEL,.70f):mix(tint,Color.WHITE,.80f)):(Apple.dark?0xff332838:0xfffff8f6),edge=selected?tintEdge(tint):edge();
  b.setBackground(lifted(c,face,edge,14,3,false));UiMotion.press(b);}
 static void field(View e){Context c=e.getContext();GradientDrawable g=new GradientDrawable();g.setCornerRadius(dp(c,14));g.setColor(Apple.dark?0xff1f1825:0xfffff6f5);g.setStroke(dp(c,2),Apple.LINE);e.setBackground(g);}
 /** Desktop-style slider: thick rounded track filled with colour, white knob ringed in colour. */
 static void styleSeek(SeekBar s,int color){Context c=s.getContext();GradientDrawable track=new GradientDrawable();track.setCornerRadius(dp(c,99));track.setColor(Apple.dark?0xff3d3047:0xfff3e4e5);
  GradientDrawable fill=new GradientDrawable();fill.setCornerRadius(dp(c,99));fill.setColor(color);
  LayerDrawable progress=new LayerDrawable(new Drawable[]{track,new ClipDrawable(fill,Gravity.START,ClipDrawable.HORIZONTAL)});progress.setId(0,android.R.id.background);progress.setId(1,android.R.id.progress);
  s.setProgressTintList(null);s.setProgressBackgroundTintList(null);s.setThumbTintList(null);s.setProgressDrawable(progress);
  if(android.os.Build.VERSION.SDK_INT>=29){s.setMinHeight(dp(c,10));s.setMaxHeight(dp(c,10));}
  GradientDrawable knob=new GradientDrawable();knob.setShape(GradientDrawable.OVAL);knob.setColor(Apple.dark?Apple.PANEL:Color.WHITE);knob.setStroke(dp(c,4),color);knob.setSize(dp(c,26),dp(c,26));s.setThumb(knob);s.setSplitTrack(false);}
 static void circle(Button b){Context c=b.getContext();base(b,15);b.setTypeface(Typeface.DEFAULT_BOLD);b.setPadding(0,0,0,dp(c,3));b.setTextColor(Apple.dark?0xffcdbfff:0xff5b44b8);
  b.setBackground(lifted(c,Apple.dark?0xff352a52:0xffefe8ff,Apple.dark?0xff1d1530:0xffd9ceff,99,3,false));UiMotion.press(b);}
}
