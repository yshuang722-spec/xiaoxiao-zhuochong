package com.xiaoxiao.pet;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.*;
import android.content.res.ColorStateList;
import android.view.*;
import android.widget.*;

/** Inset groups, single dividers, and native accessible buttons. */
final class GroupedList {
 static LinearLayout group(LinearLayout parent){Context c=parent.getContext();LinearLayout l=new LinearLayout(c);l.setOrientation(1);l.setBackground(Apple.shape(c,Apple.PANEL,14));l.setClipToOutline(true);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.topMargin=Apple.dp(c,12);parent.addView(l,p);return l;}
 static void divider(LinearLayout group){if(group.getChildCount()==0)return;View line=new View(group.getContext());line.setBackground(Apple.shape(group.getContext(),Apple.LINE,0));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,1);p.leftMargin=Apple.dp(group.getContext(),16);group.addView(line,p);}
 static Button row(LinearLayout group,String text,View.OnClickListener action){Context c=group.getContext();divider(group);Button b=new Button(c);b.setText(text);Apple.button(b,false);b.setTextColor(Apple.INK);b.setTypeface(Typeface.create("sans-serif",0));b.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);b.setSingleLine(true);b.setEllipsize(android.text.TextUtils.TruncateAt.END);b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x18656580),Apple.shape(c,Apple.PANEL,0),null));b.setPadding(Apple.dp(c,16),0,Apple.dp(c,16),0);b.setCompoundDrawablesWithIntrinsicBounds(null,null,new Chevron(c),null);b.setOnClickListener(action);group.addView(b,new LinearLayout.LayoutParams(-1,Apple.dp(c,52)));return b;}
 static Button menuOption(LinearLayout group,String text,View.OnClickListener action){Context c=group.getContext();Button b=new Button(c);b.setText(text);Apple.button(b,false);b.setTextColor(Apple.INK);b.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);b.setSingleLine(true);b.setEllipsize(android.text.TextUtils.TruncateAt.END);b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x18656580),Apple.shape(c,Apple.PANEL,12),null));b.setClipToOutline(true);b.setPadding(Apple.dp(c,12),0,Apple.dp(c,12),0);b.setOnClickListener(action);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,Apple.dp(c,48));p.topMargin=Apple.dp(c,4);p.bottomMargin=Apple.dp(c,4);group.addView(b,p);return b;}
 static Switch toggle(LinearLayout group,String text,boolean checked,android.widget.CompoundButton.OnCheckedChangeListener action){divider(group);Context c=group.getContext();Switch s=new Switch(c);s.setText(text);s.setTextSize(15);s.setTextColor(Apple.INK);s.setPadding(Apple.dp(c,16),0,Apple.dp(c,16),0);s.setChecked(checked);s.setOnCheckedChangeListener(action);group.addView(s,new LinearLayout.LayoutParams(-1,Apple.dp(c,52)));return s;}
 static final class Chevron extends Drawable {
  final int size;final Paint paint=new Paint(3);Chevron(Context c){size=Apple.dp(c,16);setBounds(0,0,size,size);}
  public int getIntrinsicWidth(){return size;}public int getIntrinsicHeight(){return size;}
  public void draw(Canvas c){paint.setColor(Apple.SECONDARY);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(size*.1f);paint.setStrokeCap(Paint.Cap.ROUND);paint.setStrokeJoin(Paint.Join.ROUND);Rect b=getBounds();Path p=new Path();p.moveTo(b.left+size*.4f,b.top+size*.25f);p.lineTo(b.left+size*.65f,b.top+size*.5f);p.lineTo(b.left+size*.4f,b.top+size*.75f);c.drawPath(p,paint);}
  public void setAlpha(int a){paint.setAlpha(a);}public void setColorFilter(ColorFilter f){paint.setColorFilter(f);}public int getOpacity(){return PixelFormat.TRANSLUCENT;}
 }
}
