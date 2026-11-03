package com.xiaoxiao.pet;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;

/** Thin directional edge light, with no refraction or blur applied to foreground content. */
final class GlassSurface extends GradientDrawable {
 private final Paint inner=new Paint(Paint.ANTI_ALIAS_FLAG);
 private final Paint edge=new Paint(Paint.ANTI_ALIAS_FLAG);
 private final float radius,width;
 private boolean glass;
 GlassSurface(Context c,int corner){radius=Apple.dp(c,corner);width=c.getResources().getDisplayMetrics().density*.85f;setCornerRadius(radius);edge.setStyle(Paint.Style.STROKE);edge.setStrokeWidth(width);inner.setStyle(Paint.Style.STROKE);inner.setStrokeWidth(width*2.6f);}
 void glass(boolean on){glass=on;shader();invalidateSelf();}
 private void shader(){Rect b=getBounds();inner.setShader(new LinearGradient(b.left,b.top,Math.max(b.left+1,b.right),Math.max(b.top+1,b.bottom),new int[]{0x38ffffff,0x04ffffff,0x1686bdda},null,Shader.TileMode.CLAMP));edge.setShader(new LinearGradient(b.left,b.top,Math.max(b.left+1,b.right),Math.max(b.top+1,b.bottom),Apple.dark?new int[]{0x75ffffff,0x12ffffff,0x08ffffff,0x38ffffff}:new int[]{0xc8ffffff,0x28ffffff,0x18000000,0x66ffffff},new float[]{0,.38f,.72f,1},Shader.TileMode.CLAMP));}
 protected void onBoundsChange(Rect b){super.onBoundsChange(b);shader();}
 public void draw(Canvas canvas){super.draw(canvas);if(glass&&radius>0){Rect b=getBounds();float inside=width*2;canvas.drawRoundRect(b.left+inside,b.top+inside,b.right-inside,b.bottom-inside,Math.max(0,radius-inside),Math.max(0,radius-inside),inner);float inset=width/2;canvas.drawRoundRect(b.left+inset,b.top+inset,b.right-inset,b.bottom-inset,Math.max(0,radius-inset),Math.max(0,radius-inset),edge);}}
}
