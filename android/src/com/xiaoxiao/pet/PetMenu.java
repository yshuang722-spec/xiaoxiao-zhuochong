package com.xiaoxiao.pet;

import android.app.Dialog;import android.content.Context;import android.graphics.*;import android.graphics.drawable.Drawable;import android.os.Build;import android.view.*;import android.widget.*;

/** Four nearby commands. The detailed action catalog is a separate scrollable surface. */
final class PetMenu {
 static void show(Context c,PetService.Pet pet){
  if(pet.frame==null||PetService.instance==null)return;
  pet.frame.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
  Dialog d=CompactPanel.create(c);LinearLayout l=new LinearLayout(c);l.setOrientation(1);int pad=Apple.dp(c,8);l.setPadding(pad,pad,pad,pad);
  TextView title=Apple.label(c,Data.name(pet.role),13,true);title.setTextColor(Apple.SECONDARY);title.setSingleLine(true);title.setEllipsize(android.text.TextUtils.TruncateAt.END);title.setPadding(pad,pad,pad,pad);l.addView(title);
  String[] names={"对话","动作","大小","隐藏"};
  for(int i=0;i<names.length;i++){final int index=i;Button b=GroupedList.menuOption(l,names[i],v->{d.dismiss();if(index==0)Chat.show(c,pet.role,pet.id);if(index==1)new ActionSheet(c,pet,false,null).show();if(index==2)SizePanel.show(c,pet);if(index==3&&PetService.instance!=null){pet.hide();PetService.instance.save();}});b.setCompoundDrawablePadding(Apple.dp(c,12));b.setCompoundDrawablesWithIntrinsicBounds(new MenuIcon(c,i),null,null,null);}
  d.setContentView(l);d.setCanceledOnTouchOutside(true);Window w=d.getWindow();w.setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY);w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
  int sw=PetService.instance.sw(),sh=PetService.instance.sh();Rect safe=new Rect(0,0,sw,sh);
  if(Build.VERSION.SDK_INT>=30){android.view.WindowMetrics m=c.getSystemService(WindowManager.class).getMaximumWindowMetrics();android.graphics.Insets in=m.getWindowInsets().getInsetsIgnoringVisibility(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());safe.set(in.left,in.top,sw-in.right,sh-in.bottom);}
  int gap=Apple.dp(c,10),width=Math.min(Apple.dp(c,176),safe.width()-2*gap);l.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));int height=Math.min(l.getMeasuredHeight(),safe.height()-2*gap);
  int left=pet.lp.x,top=pet.lp.y,right=left+pet.lp.width,bottom=top+pet.lp.height,x,y;
  if(safe.right-right>=width+2*gap){x=right+gap;y=(top+bottom-height)/2;}
  else if(left-safe.left>=width+2*gap){x=left-gap-width;y=(top+bottom-height)/2;}
  else{x=(left+right-width)/2;y=top-safe.top>safe.bottom-bottom?top-gap-height:bottom+gap;}
  x=Math.max(safe.left+gap,Math.min(safe.right-width-gap,x));y=Math.max(safe.top+gap,Math.min(safe.bottom-height-gap,y));
  d.show();Apple.dialog(d);w.setTitle("小小桌宠-快捷菜单/"+pet.id);w.setBackgroundDrawable(Apple.shape(c,Apple.PANEL,16));w.setLayout(width,height);WindowManager.LayoutParams p=w.getAttributes();p.gravity=Gravity.TOP|Gravity.LEFT;p.x=x;p.y=y;p.flags&=~WindowManager.LayoutParams.FLAG_DIM_BEHIND;p.flags|=WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL|WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;if(Build.VERSION.SDK_INT>=30)p.setFitInsetsTypes(0);w.setAttributes(p);FrostedPanel.configure(d,16,false);
 }
 static final class MenuIcon extends Drawable {
  final int size,kind;final Paint p=new Paint(3);MenuIcon(Context c,int k){size=Apple.dp(c,22);kind=k;setBounds(0,0,size,size);}
  public int getIntrinsicWidth(){return size;}public int getIntrinsicHeight(){return size;}
  public void draw(Canvas c){c.save();c.translate(getBounds().left,getBounds().top);c.scale(size/24f,size/24f);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.6f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);p.setColor(Apple.INK);Path path=new Path();
   if(kind==0){c.drawRoundRect(3,4,21,17,4,4,p);path.moveTo(6,17);path.lineTo(6,21);path.lineTo(11,17);}
   if(kind==1){path.moveTo(8,5);path.lineTo(19,12);path.lineTo(8,19);path.close();}
   if(kind==2){path.moveTo(3,9);path.lineTo(3,3);path.lineTo(9,3);path.moveTo(15,21);path.lineTo(21,21);path.lineTo(21,15);path.moveTo(7,17);path.lineTo(17,7);}
   if(kind==3){c.drawOval(3,7,21,17,p);c.drawCircle(12,12,3,p);path.moveTo(3,3);path.lineTo(21,21);}c.drawPath(path,p);c.restore();}
  public void setAlpha(int a){p.setAlpha(a);}public void setColorFilter(ColorFilter f){p.setColorFilter(f);}public int getOpacity(){return PixelFormat.TRANSLUCENT;}
 }
}

