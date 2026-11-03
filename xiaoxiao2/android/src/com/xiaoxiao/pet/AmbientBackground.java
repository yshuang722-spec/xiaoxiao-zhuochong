package com.xiaoxiao.pet;
import android.graphics.*;
import android.graphics.drawable.Drawable;
/** Dotted paper, like a sticker book page: strawberry milk by day, grape by night. */
final class AmbientBackground extends Drawable {
 final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
 public void draw(Canvas c){Rect b=getBounds();c.drawColor(Apple.BACK);float gap=Math.max(16,b.width()/24f),r=Math.max(1.6f,gap/14f);p.setColor(Apple.dark?0xff2c2234:0xfff6dfe0);
  for(float y=gap/2;y<b.height();y+=gap)for(float x=gap/2;x<b.width();x+=gap)c.drawCircle(b.left+x,b.top+y,r,p);}
 public void setAlpha(int a){p.setAlpha(a);}public void setColorFilter(ColorFilter f){p.setColorFilter(f);}public int getOpacity(){return PixelFormat.OPAQUE;}
}
