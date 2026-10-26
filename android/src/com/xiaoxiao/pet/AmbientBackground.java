package com.xiaoxiao.pet;
import android.graphics.*;
import android.graphics.drawable.Drawable;
/** Large quiet color fields, independent of the user's wallpaper. */
final class AmbientBackground extends Drawable {
 final Paint p=new Paint(3);Shader base,light,shade;
 protected void onBoundsChange(Rect b){float w=Math.max(1,b.width()),h=Math.max(1,b.height());base=new LinearGradient(0,0,w*.6f,h,Apple.dark?new int[]{0xff101d2b,0xff183e4b,0xff101b29}:new int[]{0xffdbeaf2,0xffedf1eb,0xffd6e5ef},null,Shader.TileMode.CLAMP);light=new RadialGradient(w*.85f,h*.25f,h*.65f,Apple.dark?0x403e8693:0x90ffffff,0,Shader.TileMode.CLAMP);shade=new RadialGradient(w*.08f,h*.8f,h*.65f,Apple.dark?0x30283e76:0x4083b7d1,0,Shader.TileMode.CLAMP);}
 public void draw(Canvas c){if(base==null)onBoundsChange(getBounds());for(Shader s:new Shader[]{base,light,shade}){p.setShader(s);c.drawRect(getBounds(),p);}}
 public void setAlpha(int a){p.setAlpha(a);}public void setColorFilter(ColorFilter f){p.setColorFilter(f);}public int getOpacity(){return PixelFormat.OPAQUE;}
}
