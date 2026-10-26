package com.xiaoxiao.pet;

import android.content.Context;import android.view.Gravity;import android.widget.*;

/** Shared layout for permission indicators and saved application switches. */
class SwitchRow extends LinearLayout {
 final TextView title,detail;final Switch toggle;
 SwitchRow(Context c,String name,String summary){super(c);setGravity(Gravity.CENTER_VERTICAL);int pad=Apple.dp(c,14);setPadding(pad,pad,pad,pad);setBackground(Apple.shape(c,Apple.BACK,12));
  LinearLayout copy=new LinearLayout(c);copy.setOrientation(VERTICAL);title=Apple.label(c,name,15,true);copy.addView(title);detail=Apple.label(c,summary,12,false);detail.setTextColor(Apple.SECONDARY);detail.setLineSpacing(Apple.dp(c,3),1);detail.setPadding(0,Apple.dp(c,6),0,0);copy.addView(detail);addView(copy,new LayoutParams(0,-2,1));
  toggle=new Switch(c);toggle.setShowText(false);LayoutParams p=new LayoutParams(-2,Apple.dp(c,48));p.leftMargin=Apple.dp(c,12);addView(toggle,p);
 }
}
