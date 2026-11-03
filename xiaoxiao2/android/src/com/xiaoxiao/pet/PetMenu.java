package com.xiaoxiao.pet;

import android.app.Dialog;import android.content.Context;import android.graphics.*;import android.graphics.drawable.Drawable;import android.os.Build;import android.view.*;import android.widget.*;

/** Four nearby commands. The detailed action catalog is a separate scrollable surface. */
final class PetMenu {
 static void show(Context c,PetService.Pet pet){
  if(pet.frame==null||PetService.instance==null)return;
  pet.frame.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
  Dialog d=CompactPanel.create(c);LinearLayout l=new LinearLayout(c);l.setOrientation(1);int pad=Apple.dp(c,12);l.setPadding(pad,pad,pad,pad+Apple.dp(c,5));
  int tint=Sticker.roleColor(c,pet.role);
  // Header: the role as a tiny sticker with its name and colour bar, like a desktop card title.
  LinearLayout head=new LinearLayout(c);head.setGravity(Gravity.CENTER_VERTICAL);
  ImageView face=new ImageView(c);Bitmap art=Sticker.cardArt(c,pet.role);if(art!=null)face.setImageBitmap(art);face.setScaleType(ImageView.ScaleType.FIT_CENTER);face.setBackground(Sticker.stage(c,tint));int fp=Apple.dp(c,4);face.setPadding(fp,fp,fp,fp);head.addView(face,new LinearLayout.LayoutParams(Apple.dp(c,46),Apple.dp(c,46)));
  LinearLayout nameBox=new LinearLayout(c);nameBox.setOrientation(1);TextView title=Apple.label(c,Data.name(pet.role),16,true);title.setTypeface(Typeface.DEFAULT_BOLD);title.setSingleLine(true);title.setEllipsize(android.text.TextUtils.TruncateAt.END);nameBox.addView(title);
  View bar=new View(c);android.graphics.drawable.GradientDrawable bg=new android.graphics.drawable.GradientDrawable();bg.setCornerRadius(Apple.dp(c,4));bg.setColor(tint);bar.setBackground(bg);LinearLayout.LayoutParams bl=new LinearLayout.LayoutParams(Apple.dp(c,22),Apple.dp(c,4));bl.topMargin=Apple.dp(c,6);nameBox.addView(bar,bl);
  LinearLayout.LayoutParams nl=new LinearLayout.LayoutParams(0,-2,1);nl.leftMargin=Apple.dp(c,10);head.addView(nameBox,nl);l.addView(head);
  LinearLayout.LayoutParams dl=new LinearLayout.LayoutParams(-1,Apple.dp(c,2));dl.topMargin=Apple.dp(c,10);dl.bottomMargin=Apple.dp(c,4);l.addView(Sticker.dashed(c),dl);
  String[] names={"对话","动作","大小","隐藏"};
  for(int r=0;r<2;r++){LinearLayout grid=new LinearLayout(c);for(int k=0;k<2;k++){final int index=r*2+k;Button b=new Button(c);b.setText(names[index]);Sticker.tile(b,tint,index==3);MenuIcon icon=new MenuIcon(c,index);icon.color=index==3?Apple.DANGER:Apple.INK;b.setCompoundDrawablesWithIntrinsicBounds(null,icon,null,null);b.setCompoundDrawablePadding(Apple.dp(c,4));b.setPadding(0,Apple.dp(c,10),0,Apple.dp(c,13));
    LinearLayout.LayoutParams cell=new LinearLayout.LayoutParams(0,Apple.dp(c,76),1);cell.topMargin=Apple.dp(c,8);if(k>0)cell.leftMargin=Apple.dp(c,8);grid.addView(b,cell);
    b.setOnClickListener(v->{d.dismiss();if(index==0)Chat.show(c,pet.role,pet.id);if(index==1)new ActionSheet(c,pet,false,null).show();if(index==2)SizePanel.show(c,pet);if(index==3&&PetService.instance!=null){pet.hide();PetService.instance.save();}});}
   l.addView(grid);}
  d.setContentView(l);d.setCanceledOnTouchOutside(true);Window w=d.getWindow();w.setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY);w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
  int sw=PetService.instance.sw(),sh=PetService.instance.sh();Rect safe=new Rect(0,0,sw,sh);
  if(Build.VERSION.SDK_INT>=30){android.view.WindowMetrics m=c.getSystemService(WindowManager.class).getMaximumWindowMetrics();android.graphics.Insets in=m.getWindowInsets().getInsetsIgnoringVisibility(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());safe.set(in.left,in.top,sw-in.right,sh-in.bottom);}
  int gap=Apple.dp(c,10),width=Math.min(Apple.dp(c,216),safe.width()-2*gap);l.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));int height=Math.min(l.getMeasuredHeight(),safe.height()-2*gap);
  int left=pet.lp.x,top=pet.lp.y,right=left+pet.lp.width,bottom=top+pet.lp.height,x,y;
  if(safe.right-right>=width+2*gap){x=right+gap;y=(top+bottom-height)/2;}
  else if(left-safe.left>=width+2*gap){x=left-gap-width;y=(top+bottom-height)/2;}
  else{x=(left+right-width)/2;y=top-safe.top>safe.bottom-bottom?top-gap-height:bottom+gap;}
  x=Math.max(safe.left+gap,Math.min(safe.right-width-gap,x));y=Math.max(safe.top+gap,Math.min(safe.bottom-height-gap,y));
  d.show();Apple.dialog(d);w.setTitle("小小桌宠-快捷菜单/"+pet.id);w.setLayout(width,height);WindowManager.LayoutParams p=w.getAttributes();p.gravity=Gravity.TOP|Gravity.LEFT;p.x=x;p.y=y;p.flags&=~WindowManager.LayoutParams.FLAG_DIM_BEHIND;p.flags|=WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL|WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;if(Build.VERSION.SDK_INT>=30)p.setFitInsetsTypes(0);w.setAttributes(p);FrostedPanel.configure(d,18,false);
 }
 static final class MenuIcon extends Drawable {
  final int size,kind;int color=Apple.INK;final Paint p=new Paint(3);MenuIcon(Context c,int k){size=Apple.dp(c,22);kind=k;setBounds(0,0,size,size);}
  public int getIntrinsicWidth(){return size;}public int getIntrinsicHeight(){return size;}
  public void draw(Canvas c){c.save();c.translate(getBounds().left,getBounds().top);c.scale(size/24f,size/24f);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.9f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);p.setColor(color);Path path=new Path();
   if(kind==0){c.drawRoundRect(3,4,21,17,4,4,p);path.moveTo(6,17);path.lineTo(6,21);path.lineTo(11,17);}
   if(kind==1){path.moveTo(8,5);path.lineTo(19,12);path.lineTo(8,19);path.close();}
   if(kind==2){path.moveTo(3,9);path.lineTo(3,3);path.lineTo(9,3);path.moveTo(15,21);path.lineTo(21,21);path.lineTo(21,15);path.moveTo(7,17);path.lineTo(17,7);}
   if(kind==3){c.drawOval(3,7,21,17,p);c.drawCircle(12,12,3,p);path.moveTo(3,3);path.lineTo(21,21);}c.drawPath(path,p);c.restore();}
  public void setAlpha(int a){p.setAlpha(a);}public void setColorFilter(ColorFilter f){p.setColorFilter(f);}public int getOpacity(){return PixelFormat.TRANSLUCENT;}
 }
}

